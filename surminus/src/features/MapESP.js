/**
 * MapESP - Show all enemies on minimap with BitStream encoder/decoder
 * Enhanced with proper binary serialization
 */

import { gameManager } from '@/core/state.js';
import { settings } from '@/core/state.js';
import { translations } from '@/core/obfuscatedNameTranslator.js';
import { BitStream, PlayerDataCodec } from '@/utils/bitBuffer.js';

const PLAYER_DOT_SCALE = 0.5;
const PLAYER_DOT_COLOR = 0xff3333;
const ALLY_DOT_COLOR = 0x4da6ff;
const DEAD_PLAYER_COLOR = 0x666666;
const MAP_WORLD_SIZE = 1024;

class PlayerDataParser {
  constructor() {
    this.players = new Map();
    this.mapInfo = { width: 512, height: 512 };
  }

  /**
   * Parse player data using BitStream decoder
   */
  parsePlayerData(bitBuffer) {
    try {
      const stream = new BitStream(bitBuffer);
      return PlayerDataCodec.decodePlayersUpdate(stream);
    } catch (e) {
      console.error('[MapESP] BitStream parse error:', e);
      return [];
    }
  }

  /**
   * Encode player snapshot for storage
   */
  encodePlayerSnapshot(players) {
    const stream = new BitStream();
    const encoded = players.map(p => ({
      id: p.__id,
      pos: p[translations.visualPos_] || { x: 0, y: 0 },
      health: p[translations.netData_]?.[translations.health_] || 100,
      team: p[translations.netData_]?.[translations.teamId_] || 0,
      alive: !p[translations.netData_]?.[translations.dead_]
    }));

    PlayerDataCodec.encodePlayersUpdate(stream, encoded);
    return stream.getBuffer();
  }

  // Transform world coordinates to map screen position
  transformToMapCoords(worldPos, mapBounds = null, screenSize = null) {
    const bounds = mapBounds || {
      min: { x: 0, y: 0 },
      max: { x: MAP_WORLD_SIZE, y: MAP_WORLD_SIZE }
    };

    const screen = screenSize || {
      width: 256,
      height: 256
    };

    const mapWidth = bounds.max.x - bounds.min.x;
    const mapHeight = bounds.max.y - bounds.min.y;

    const clampedX = Math.max(bounds.min.x, Math.min(bounds.max.x, worldPos.x));
    const clampedY = Math.max(bounds.min.y, Math.min(bounds.max.y, worldPos.y));

    const relX = (clampedX - bounds.min.x) / mapWidth;
    const relY = (clampedY - bounds.min.y) / mapHeight;

    return {
      x: relX * screen.width,
      y: relY * screen.height
    };
  }

  // Calculate distance between two world positions
  getDistance(pos1, pos2) {
    if (!pos1 || !pos2) return 0;
    const dx = pos1.x - pos2.x;
    const dy = pos1.y - pos2.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  updatePlayer(playerId, data) {
    this.players.set(playerId, {
      ...data,
      lastUpdate: Date.now()
    });
  }

  getPlayer(playerId) {
    return this.players.get(playerId);
  }

  getAllPlayers() {
    return Array.from(this.players.values());
  }

  removePlayer(playerId) {
    this.players.delete(playerId);
  }

  removeStale(maxAge = 5000) {
    const now = Date.now();
    for (const [id, player] of this.players) {
      if (now - player.lastUpdate > maxAge) {
        this.players.delete(id);
      }
    }
  }
}

const playerParser = new PlayerDataParser();

export default function () {
  try {
    const game = gameManager.game;
    if (!game || !game.initialized) return;

    let createdPlayerIndicators = {};

    const uiManager = game[translations.uiManager_];
    if (!uiManager) return;

    const mapIndicatorBarn = uiManager.mapIndicatorBarn;
    if (!mapIndicatorBarn) return;

    // Intercept packet/update handler to parse player data
    // Hook into game's update message parsing
    const originalUpdateIndicatorData = mapIndicatorBarn.updateIndicatorData.bind(mapIndicatorBarn);

    mapIndicatorBarn.updateIndicatorData = function (indicatorData) {
      originalUpdateIndicatorData(indicatorData);

      if (!settings.mapESP_?.enabled_) return;

      // Get current game bounds for coordinate transform
      const mapDef = game.mapName || 'default';
      const mapBounds = { 
        min: { x: 0, y: 0 }, 
        max: { x: 1024, y: 1024 } 
      };

      const screenSize = {
        width: this.width || 200,
        height: this.height || 200
      };

      const playerBarn = game[translations.playerManager_] || game[translations.playerBarn_];
      if (!playerBarn) return;

      const players = playerBarn.m_getPool?.() || playerBarn.playerPool?.[translations.pool_] || [];
      const activePlayer = game[translations.activePlayer_];

      if (!players || !activePlayer) return;

      const newPlayerIndicators = {};

      // Process each player and create/update indicator
      for (const player of players) {
        if (!player || !player.active) continue;
        if (player.__id === activePlayer.__id) continue;

        const isDead = player[translations.netData_]?.[translations.dead_];
        if (isDead) continue;

        const playerId = player.__id;
        newPlayerIndicators[playerId] = true;

        // Get world position
        const visualPos = player[translations.visualPos_];
        if (!visualPos) continue;

        // Transform to map coordinates
        const mapCoords = playerParser.transformToMapCoords(
          visualPos,
          mapBounds,
          screenSize
        );

        // Update parser data
        const meTeam = game[translations.activePlayer_]?.[translations.netData_]?.[translations.teamId_];
        const playerTeam = player[translations.netData_]?.[translations.teamId_];
        const isSameTeam = meTeam && playerTeam && meTeam === playerTeam;

        // Calculate distance
        const distance = playerParser.getDistance(
          activePlayer[translations.visualPos_],
          visualPos
        );

        const playerName = player.nameText?._text || 'Unknown';
        const health = player[translations.netData_]?.[translations.health_] || 100;

        playerParser.updatePlayer(playerId, {
          pos: mapCoords,
          team: playerTeam,
          isSameTeam,
          alive: true,
          worldPos: visualPos,
          playerName,
          health: Math.round(health),
          distance: Math.round(distance)
        });

        // Get or create indicator
        let indicator = this.idToMapIdicator[playerId];

        if (!indicator) {
          indicator = {
            id: playerId,
            type: 'player_' + playerId,
            pos: mapCoords,
            equipped: false,
            mapSprite: this.mapSpriteBarn.addSprite(),
            pulseSprite: this.mapSpriteBarn.addSprite(),
            isPlayerIndicator: true,
            nameText: null // Will create PIXI text
          };

          this.mapIndicators.push(indicator);
          this.idToMapIdicator[playerId] = indicator;
        }

        // Update position
        indicator.pos = mapCoords;
        indicator.mapSprite.pos = { x: mapCoords.x, y: mapCoords.y };
        indicator.pulseSprite.pos = { x: mapCoords.x, y: mapCoords.y };

        const dotColor = isSameTeam ? ALLY_DOT_COLOR : PLAYER_DOT_COLOR;

        // Create or update dot sprite
        if (!indicator.mapSprite.sprite.texture || !indicator.mapSprite.sprite._texture) {
          const graphics = new (game.m_renderer?.m_pixi?.Graphics_ || window.PIXI?.Graphics)();
          graphics.beginFill(dotColor);
          graphics.drawCircle(0, 0, 8);
          graphics.endFill();

          const texture = graphics.generateCanvasTexture();
          indicator.mapSprite.sprite.texture = texture;
        }

        indicator.mapSprite.scale = PLAYER_DOT_SCALE;
        indicator.mapSprite.alpha = 1;
        indicator.mapSprite.zOrder = 655350;
        indicator.mapSprite.visible = true;
        indicator.mapSprite.sprite.tint = dotColor;

        // Create or update name label
        if (!indicator.nameText) {
          const TextClass = game.m_renderer?.m_pixi?.Text || window.PIXI?.Text;
          if (TextClass) {
            indicator.nameText = new TextClass(
              `${playerName} (${distance}m)`,
              {
                fontFamily: 'Arial',
                fontSize: 10,
                fill: isSameTeam ? 0x4da6ff : 0xff3333,
                align: 'center',
                dropShadow: true,
                dropShadowBlur: 2,
                dropShadowColor: 0x000000,
                dropShadowDistance: 1
              }
            );
            indicator.nameText.anchor.set(0.5, 1);
            indicator.nameText.position.set(mapCoords.x, mapCoords.y - 12);
            indicator.nameText.zIndex = 655351;

            // Add to map container if possible
            if (this.container) {
              this.container.addChild(indicator.nameText);
            }
          }
        } else {
          // Update text
          indicator.nameText.text = `${playerName} (${distance}m)`;
          indicator.nameText.position.set(mapCoords.x, mapCoords.y - 12);
          indicator.nameText.style.fill = isSameTeam ? 0x4da6ff : 0xff3333;
        }

        // Pulse effect
        if (indicator.pulseSprite.sprite) {
          indicator.pulseSprite.pos = { x: mapCoords.x, y: mapCoords.y };
          indicator.pulseSprite.scale = 1;
          indicator.pulseSprite.zOrder = 655349;
          indicator.pulseSprite.visible = true;
          indicator.pulseSprite.alpha = 0.3;
        }
      }

      // Remove stale indicators
      for (const id in createdPlayerIndicators) {
        if (!newPlayerIndicators[id]) {
          const indicator = this.idToMapIdicator[id];
          if (indicator && indicator.isPlayerIndicator) {
            this.removeIndicator(id);
          }
          playerParser.removePlayer(id);
        }
      }

      // Clean stale data
      playerParser.removeStale(5000);

      createdPlayerIndicators = newPlayerIndicators;
    };

    // Force visibility update each frame
    const originalUpdateIndicatorPulses = mapIndicatorBarn.updateIndicatorPulses?.bind(mapIndicatorBarn);
    if (originalUpdateIndicatorPulses) {
      mapIndicatorBarn.updateIndicatorPulses = function (dt) {
        originalUpdateIndicatorPulses(dt);

        if (!settings.mapESP_?.enabled_) return;

        for (const indicator of this.mapIndicators) {
          if (indicator.isPlayerIndicator) {
            if (indicator.mapSprite) {
              indicator.mapSprite.visible = true;
              indicator.mapSprite.alpha = 1;
            }
            if (indicator.pulseSprite) {
              indicator.pulseSprite.visible = true;
            }
          }
        }
      };
    }

  } catch (error) {
    console.error('[MapESP] Error:', error);
  }
}

