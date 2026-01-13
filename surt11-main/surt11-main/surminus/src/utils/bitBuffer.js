/**
 * BitStream - Efficient binary data serialization
 * Read/Write bits, bytes, floats, positions efficiently
 * Similar to survev.io network protocol
 */

export class BitStream {
  constructor(arrayBuffer = null) {
    if (arrayBuffer instanceof ArrayBuffer) {
      this.buffer = new Uint8Array(arrayBuffer);
    } else if (arrayBuffer instanceof Uint8Array) {
      this.buffer = arrayBuffer;
    } else {
      this.buffer = new Uint8Array(1024); // Default 1KB
    }
    this.byteIndex = 0;
    this.bitIndex = 0;
  }

  /**
   * Get current bit position
   */
  getBitPosition() {
    return this.byteIndex * 8 + this.bitIndex;
  }

  /**
   * Align to next byte boundary
   */
  alignToNextByte() {
    if (this.bitIndex > 0) {
      this.byteIndex++;
      this.bitIndex = 0;
    }
  }

  /**
   * Read N bits
   */
  readBits(n) {
    if (n === 0) return 0;
    if (n > 32) throw new Error('Cannot read more than 32 bits at once');

    let value = 0;
    for (let i = 0; i < n; i++) {
      const byteIdx = this.byteIndex;
      const bitIdx = this.bitIndex;
      const bit = (this.buffer[byteIdx] >> (7 - bitIdx)) & 1;
      value = (value << 1) | bit;

      this.bitIndex++;
      if (this.bitIndex === 8) {
        this.byteIndex++;
        this.bitIndex = 0;
      }
    }
    return value;
  }

  /**
   * Write N bits
   */
  writeBits(value, n) {
    if (n === 0) return;
    if (n > 32) throw new Error('Cannot write more than 32 bits at once');
    if (value < 0) throw new Error('Cannot write negative values');

    // Ensure buffer is large enough
    const requiredBytes = Math.ceil((this.byteIndex * 8 + this.bitIndex + n) / 8);
    if (requiredBytes > this.buffer.length) {
      const newBuffer = new Uint8Array(Math.max(requiredBytes, this.buffer.length * 2));
      newBuffer.set(this.buffer);
      this.buffer = newBuffer;
    }

    for (let i = n - 1; i >= 0; i--) {
      const bit = (value >> i) & 1;
      const byteIdx = this.byteIndex;
      const bitIdx = this.bitIndex;

      if (bit) {
        this.buffer[byteIdx] |= (1 << (7 - bitIdx));
      } else {
        this.buffer[byteIdx] &= ~(1 << (7 - bitIdx));
      }

      this.bitIndex++;
      if (this.bitIndex === 8) {
        this.byteIndex++;
        this.bitIndex = 0;
      }
    }
  }

  /**
   * Read unsigned 8-bit integer
   */
  readUint8() {
    return this.readBits(8);
  }

  /**
   * Write unsigned 8-bit integer
   */
  writeUint8(value) {
    this.writeBits(value & 0xff, 8);
  }

  /**
   * Read signed 8-bit integer
   */
  readInt8() {
    let val = this.readBits(8);
    if (val & 0x80) val = val - 0x100;
    return val;
  }

  /**
   * Write signed 8-bit integer
   */
  writeInt8(value) {
    value = Math.max(-128, Math.min(127, value));
    if (value < 0) value = value + 0x100;
    this.writeBits(value & 0xff, 8);
  }

  /**
   * Read unsigned 16-bit integer
   */
  readUint16() {
    return this.readBits(16);
  }

  /**
   * Write unsigned 16-bit integer
   */
  writeUint16(value) {
    this.writeBits(value & 0xffff, 16);
  }

  /**
   * Read signed 16-bit integer
   */
  readInt16() {
    let val = this.readBits(16);
    if (val & 0x8000) val = val - 0x10000;
    return val;
  }

  /**
   * Write signed 16-bit integer
   */
  writeInt16(value) {
    value = Math.max(-32768, Math.min(32767, value));
    if (value < 0) value = value + 0x10000;
    this.writeBits(value & 0xffff, 16);
  }

  /**
   * Read unsigned 32-bit integer
   */
  readUint32() {
    return this.readBits(32) >>> 0;
  }

  /**
   * Write unsigned 32-bit integer
   */
  writeUint32(value) {
    this.writeBits(value >>> 0, 32);
  }

  /**
   * Read signed 32-bit integer
   */
  readInt32() {
    let val = this.readBits(32);
    if (val & 0x80000000) val = val - 0x100000000;
    return val;
  }

  /**
   * Write signed 32-bit integer
   */
  writeInt32(value) {
    if (value < 0) value = value + 0x100000000;
    this.writeBits(value & 0xffffffff, 32);
  }

  /**
   * Read float with specified bit precision
   * min, max: range, bits: precision
   */
  readFloat(min = 0, max = 1, bits = 16) {
    const maxVal = (1 << bits) - 1;
    const intVal = this.readBits(bits);
    return min + (intVal / maxVal) * (max - min);
  }

  /**
   * Write float with specified bit precision
   */
  writeFloat(value, min = 0, max = 1, bits = 16) {
    value = Math.max(min, Math.min(max, value));
    const maxVal = (1 << bits) - 1;
    const intVal = Math.round(((value - min) / (max - min)) * maxVal);
    this.writeBits(intVal, bits);
  }

  /**
   * Read boolean
   */
  readBoolean() {
    return this.readBits(1) === 1;
  }

  /**
   * Write boolean
   */
  writeBoolean(value) {
    this.writeBits(value ? 1 : 0, 1);
  }

  /**
   * Read string (max length first as uint8, then chars)
   */
  readString(maxLen = 255) {
    const len = this.readUint8();
    let str = '';
    for (let i = 0; i < len; i++) {
      str += String.fromCharCode(this.readUint8());
    }
    return str;
  }

  /**
   * Write string (max length first as uint8, then chars)
   */
  writeString(value, maxLen = 255) {
    value = value.substring(0, maxLen);
    this.writeUint8(value.length);
    for (let i = 0; i < value.length; i++) {
      this.writeUint8(value.charCodeAt(i));
    }
  }

  /**
   * Read map position (fixed point: -512 to 512)
   */
  readMapPos() {
    const x = this.readInt16() / 16.0;
    const y = this.readInt16() / 16.0;
    return { x, y };
  }

  /**
   * Write map position (fixed point)
   */
  writeMapPos(pos) {
    this.writeInt16(Math.round(pos.x * 16));
    this.writeInt16(Math.round(pos.y * 16));
  }

  /**
   * Read vector normalized (two floats in range)
   */
  readVec(minX = 0, minY = 0, maxX = 1, maxY = 1, bits = 8) {
    const x = this.readFloat(minX, maxX, bits);
    const y = this.readFloat(minY, maxY, bits);
    return { x, y };
  }

  /**
   * Write vector normalized
   */
  writeVec(pos, minX = 0, minY = 0, maxX = 1, maxY = 1, bits = 8) {
    this.writeFloat(pos.x, minX, maxX, bits);
    this.writeFloat(pos.y, minY, maxY, bits);
  }

  /**
   * Read array of items
   */
  readArray(maxLen, reader) {
    const len = this.readUint8();
    const arr = [];
    for (let i = 0; i < len; i++) {
      arr.push(reader.call(this));
    }
    return arr;
  }

  /**
   * Write array of items
   */
  writeArray(items, maxLen, writer) {
    const len = Math.min(items.length, maxLen);
    this.writeUint8(len);
    for (let i = 0; i < len; i++) {
      writer.call(this, items[i]);
    }
  }

  /**
   * Get buffer as Uint8Array
   */
  getBuffer() {
    return this.buffer.slice(0, this.byteIndex + (this.bitIndex > 0 ? 1 : 0));
  }

  /**
   * Get remaining bits to read
   */
  getRemainingBits() {
    return (this.buffer.length - this.byteIndex) * 8 - this.bitIndex;
  }

  /**
   * Reset position
   */
  reset() {
    this.byteIndex = 0;
    this.bitIndex = 0;
  }

  /**
   * Clone this stream
   */
  clone() {
    const newStream = new BitStream(this.buffer.slice());
    newStream.byteIndex = this.byteIndex;
    newStream.bitIndex = this.bitIndex;
    return newStream;
  }
}

/**
 * Player Data Encoder/Decoder
 */
export class PlayerDataCodec {
  /**
   * Encode player position
   */
  static encodePlayerPos(stream, pos) {
    stream.writeMapPos(pos);
  }

  /**
   * Decode player position
   */
  static decodePlayerPos(stream) {
    return stream.readMapPos();
  }

  /**
   * Encode player health (0-100)
   */
  static encodeHealth(stream, health) {
    stream.writeFloat(health, 0, 100, 8);
  }

  /**
   * Decode player health
   */
  static decodeHealth(stream) {
    return stream.readFloat(0, 100, 8);
  }

  /**
   * Encode player data (position + health + team)
   */
  static encodePlayerData(stream, playerData) {
    this.encodePlayerPos(stream, playerData.pos);
    this.encodeHealth(stream, playerData.health);
    stream.writeUint8(playerData.team || 0);
    stream.writeBoolean(playerData.alive);
  }

  /**
   * Decode player data
   */
  static decodePlayerData(stream) {
    return {
      pos: this.decodePlayerPos(stream),
      health: this.decodeHealth(stream),
      team: stream.readUint8(),
      alive: stream.readBoolean()
    };
  }

  /**
   * Encode update message with multiple players
   */
  static encodePlayersUpdate(stream, players) {
    // Write player count (max 255)
    const count = Math.min(players.length, 255);
    stream.writeUint8(count);

    for (let i = 0; i < count; i++) {
      stream.writeUint16(players[i].id);
      this.encodePlayerData(stream, players[i]);
    }
  }

  /**
   * Decode update message
   */
  static decodePlayersUpdate(stream) {
    const count = stream.readUint8();
    const players = [];

    for (let i = 0; i < count; i++) {
      const id = stream.readUint16();
      const data = this.decodePlayerData(stream);
      players.push({
        id,
        ...data
      });
    }

    return players;
  }
}

// Export for use
export default BitStream;
