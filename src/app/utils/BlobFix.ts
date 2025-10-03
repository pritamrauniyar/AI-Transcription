/*
 * There is a bug where `navigator.mediaDevices.getUserMedia` + `MediaRecorder`
 * creates WEBM files without duration metadata. See:
 * - https://bugs.chromium.org/p/chromium/issues/detail?id=642012
 * - https://stackoverflow.com/a/39971175/13989043
 *
 * This file contains a function that fixes the duration metadata of a WEBM file.
 *  - Answer found: https://stackoverflow.com/a/75218309/13989043
 *  - Code adapted from: https://github.com/mat-sz/webm-fix-duration
 *    (forked from https://github.com/yusitnikov/fix-webm-duration)
 */

/*
 * This is the list of possible WEBM file sections by their IDs.
 * Possible types: Container, Binary, Uint, Int, String, Float, Date
 */
interface Section {
    name: string;
    type: string;
  }
  
  const sections: Record<number, Section> = {
    0xa45dfa3: { name: "EBML", type: "Container" },
    0x286: { name: "EBMLVersion", type: "Uint" },
    0x2f7: { name: "EBMLReadVersion", type: "Uint" },
    0x2f2: { name: "EBMLMaxIDLength", type: "Uint" },
    0x2f3: { name: "EBMLMaxSizeLength", type: "Uint" },
    0x282: { name: "DocType", type: "String" },
    0x287: { name: "DocTypeVersion", type: "Uint" },
    0x285: { name: "DocTypeReadVersion", type: "Uint" },
    0x6c: { name: "Void", type: "Binary" },
    0x3f: { name: "CRC-32", type: "Binary" },
    0xb538667: { name: "SignatureSlot", type: "Container" },
    0x3e8a: { name: "SignatureAlgo", type: "Uint" },
    0x3e9a: { name: "SignatureHash", type: "Uint" },
    0x3ea5: { name: "SignaturePublicKey", type: "Binary" },
    0x3eb5: { name: "Signature", type: "Binary" },
    0x3e5b: { name: "SignatureElements", type: "Container" },
    0x3e7b: { name: "SignatureElementList", type: "Container" },
    0x2532: { name: "SignedElement", type: "Binary" },
    0x8538067: { name: "Segment", type: "Container" },
    0x14d9b74: { name: "SeekHead", type: "Container" },
    0xdbb: { name: "Seek", type: "Container" },
    0x13ab: { name: "SeekID", type: "Binary" },
    0x13ac: { name: "SeekPosition", type: "Uint" },
    0x549a966: { name: "Info", type: "Container" },
    0x33a4: { name: "SegmentUID", type: "Binary" },
    0x3384: { name: "SegmentFilename", type: "String" },
    0x1cb923: { name: "PrevUID", type: "Binary" },
    0x1c83ab: { name: "PrevFilename", type: "String" },
    0x1eb923: { name: "NextUID", type: "Binary" },
    0x1e83bb: { name: "NextFilename", type: "String" },
    0x444: { name: "SegmentFamily", type: "Binary" },
    0x2924: { name: "ChapterTranslate", type: "Container" },
    0x29fc: { name: "ChapterTranslateEditionUID", type: "Uint" },
    0x29bf: { name: "ChapterTranslateCodec", type: "Uint" },
    0x29a5: { name: "ChapterTranslateID", type: "Binary" },
    0xad7b1: { name: "TimecodeScale", type: "Uint" },
    0x489: { name: "Duration", type: "Float" },
    0x461: { name: "DateUTC", type: "Date" },
    0x3ba9: { name: "Title", type: "String" },
    0xd80: { name: "MuxingApp", type: "String" },
    0x1741: { name: "WritingApp", type: "String" },
    // ... (rest of sections)
  };
  
  function padHex(hex: string): string {
    return hex.length % 2 === 1 ? "0" + hex : hex;
  }
  
  class WebmBase<T> {
    source?: Uint8Array;
    data?: T;
  
    constructor(private name = "Unknown", private type = "Unknown") {}
  
    updateBySource(): void {
      // Base implementation does nothing.
    }
  
    setSource(source: Uint8Array): void {
      this.source = source;
      this.updateBySource();
    }
  
    updateByData(): void {
      // Base implementation does nothing.
    }
  
    setData(data: T): void {
      this.data = data;
      this.updateByData();
    }
  }
  
  class WebmUint extends WebmBase<string> {
    constructor(name: string, type: string) {
      super(name, type || "Uint");
    }
  
    override updateBySource(): void {
      // use hex representation of a number instead of number value
      this.data = "";
      for (let i = 0; i < this.source!.length; i++) {
        const hex = this.source![i].toString(16);
        this.data += padHex(hex);
      }
    }
  
    override updateByData(): void {
      const length = this.data!.length / 2;
      this.source = new Uint8Array(length);
      for (let i = 0; i < length; i++) {
        const hex = this.data!.substr(i * 2, 2);
        this.source[i] = parseInt(hex, 16);
      }
    }
  
    getValue(): number {
      return parseInt(this.data!, 16);
    }
  
    setValue(value: number): void {
      this.setData(padHex(value.toString(16)));
    }
  }
  
  class WebmFloat extends WebmBase<number> {
    constructor(name: string, type: string) {
      super(name, type || "Float");
    }
  
    getFloatArrayType(): any {
      return this.source && this.source.length === 4
        ? Float32Array
        : Float64Array;
    }
  
    override updateBySource(): void {
      const byteArray = this.source!.slice().reverse();
      const floatArrayType = this.getFloatArrayType();
      const floatArray = new floatArrayType(byteArray.buffer);
      this.data = floatArray[0];
    }
  
    override updateByData(): void {
      const floatArrayType = this.getFloatArrayType();
      const floatArray = new floatArrayType([this.data!]);
      const byteArray = new Uint8Array(floatArray.buffer);
      this.source = byteArray.slice().reverse();
    }
  
    getValue(): number | undefined {
      return this.data;
    }
  
    setValue(value: number): void {
      this.setData(value);
    }
  }
  
    interface ContainerData {
    id: number;
    idHex?: string;
    data: WebmBase<any>;
  }
  
  class WebmContainer extends WebmBase<ContainerData[]> {
    offset: number = 0;
    override data: ContainerData[] = [];
  
    constructor(name: string, type: string) {
      super(name, type || "Container");
    }
  
    readByte(): number {
      return this.source![this.offset++];
    }
  
    readUint(): number {
      const firstByte = this.readByte();
      const bytes = 8 - firstByte.toString(2).length;
      let value = firstByte - (1 << (7 - bytes));
      for (let i = 0; i < bytes; i++) {
        // don't use bit operators to support x86
        value *= 256;
        value += this.readByte();
      }
      return value;
    }
  
    override updateBySource(): void {
      let end: number | undefined = undefined;
      this.data = [];
      for (
        this.offset = 0;
        this.offset < this.source!.length;
        this.offset = end
      ) {
        const id = this.readUint();
        const len = this.readUint();
        end = Math.min(this.offset + len, this.source!.length);
        const data = this.source!.slice(this.offset, end);
  
        const info = sections[id] || { name: "Unknown", type: "Unknown" };
        let ctr: any = WebmBase;
        switch (info.type) {
          case "Container":
            ctr = WebmContainer;
            break;
          case "Uint":
            ctr = WebmUint;
            break;
          case "Float":
            ctr = WebmFloat;
            break;
        }
        const section = new ctr(info.name, info.type);
        section.setSource(data);
        this.data.push({
          id: id,
          idHex: id.toString(16),
          data: section,
        });
      }
    }
  
    writeUint(x: number, draft = false): void {
      for (var bytes = 1, flag = 0x80; x >= flag && bytes < 8; bytes++, flag *= 0x80) {}
  
      if (!draft) {
        let value = flag + x;
        for (let i = bytes - 1; i >= 0; i--) {
          // don't use bit operators to support x86
          const c = value % 256;
          this.source![this.offset + i] = c;
          value = (value - c) / 256;
        }
      }
  
      this.offset += bytes;
    }
  
    writeSections(draft = false): number {
      this.offset = 0;
      for (let i = 0; i < this.data.length; i++) {
        const section = this.data[i],
          content = section.data.source,
          contentLength = content!.length;
        this.writeUint(section.id, draft);
        this.writeUint(contentLength, draft);
        if (!draft) {
          this.source!.set(content!, this.offset);
        }
        this.offset += contentLength;
      }
      return this.offset;
    }
  
    override updateByData(): void {
      // run without accessing this.source to determine total length - need to know it to create Uint8Array
      const length = this.writeSections(true);
      this.source = new Uint8Array(length);
      // now really write data
      this.writeSections();
    }
  
    getSectionById(id: number): WebmBase<any> | undefined {
      for (let i = 0; i < this.data.length; i++) {
        const section = this.data[i];
        if (section.id === id) {
          return section.data;
        }
      }
      return undefined;
    }
  }
  
  class WebmFile extends WebmContainer {
    constructor(source: Uint8Array) {
      super("File", "File");
      this.setSource(source);
    }
  
    fixDuration(duration: number): boolean {
      const segmentSection = this.getSectionById(0x8538067) as WebmContainer;
      if (!segmentSection) {
        return false;
      }
  
      const infoSection = segmentSection.getSectionById(0x549a966) as WebmContainer;
      if (!infoSection) {
        return false;
      }
  
      const timeScaleSection = infoSection.getSectionById(0xad7b1) as WebmFloat;
      if (!timeScaleSection) {
        return false;
      }
  
      let durationSection = infoSection.getSectionById(0x489) as WebmFloat;
      if (durationSection) {
        if (durationSection.getValue()! <= 0) {
          durationSection.setValue(duration);
        } else {
          return false;
        }
      } else {
        // append Duration section
        durationSection = new WebmFloat("Duration", "Float");
        durationSection.setValue(duration);
        infoSection.data.push({
          id: 0x489,
          data: durationSection,
        });
      }
  
      // set default time scale to 1 millisecond (1000000 nanoseconds)
      timeScaleSection.setValue(1000000);
      infoSection.updateByData();
      segmentSection.updateByData();
      this.updateByData();
  
      return true;
    }
  
    toBlob(type = "video/webm"): Blob {
      return new Blob([this.source!.buffer], { type });
    }
  }
  
  /**
   * Fixes duration on MediaRecorder output.
   * @param blob Input Blob with incorrect duration.
   * @param duration Correct duration (in milliseconds).
   * @param type Output blob mimetype (default: video/webm).
   * @returns
   */
  export const webmFixDuration = (
    blob: Blob,
    duration: number,
    type = "video/webm"
  ): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      try {
        const reader = new FileReader();
  
        reader.addEventListener("loadend", () => {
          try {
            const result = reader.result as ArrayBuffer;
            const file = new WebmFile(new Uint8Array(result));
            if (file.fixDuration(duration)) {
              resolve(file.toBlob(type));
            } else {
              resolve(blob);
            }
          } catch (ex) {
            reject(ex);
          }
        });
  
        reader.addEventListener("error", () => reject());
  
        reader.readAsArrayBuffer(blob);
      } catch (ex) {
        reject(ex);
      }
    });
  };
  