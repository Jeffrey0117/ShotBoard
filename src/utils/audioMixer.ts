/**
 * AudioMixer - 使用 Web Audio API 混合多個音訊來源
 *
 * 支援：
 * - 麥克風音訊
 * - 系統音訊（透過 desktopCapturer）
 * - 獨立音量控制
 * - 靜音切換
 */
export class AudioMixer {
  private audioContext: AudioContext;
  private destination: MediaStreamAudioDestinationNode;

  private microphoneSource: MediaStreamAudioSourceNode | null = null;
  private microphoneGain: GainNode | null = null;
  private microphoneMuted: boolean = false;
  private microphoneVolume: number = 1;

  private systemAudioSource: MediaStreamAudioSourceNode | null = null;
  private systemAudioGain: GainNode | null = null;
  private systemAudioMuted: boolean = false;
  private systemAudioVolume: number = 1;

  constructor() {
    this.audioContext = new AudioContext();
    this.destination = this.audioContext.createMediaStreamDestination();
  }

  /**
   * 添加麥克風音訊來源
   */
  addMicrophone(stream: MediaStream): void {
    // 如果已經有麥克風來源，先移除
    this.removeMicrophone();

    const audioTrack = stream.getAudioTracks()[0];
    if (!audioTrack) {
      console.warn('No audio track found in microphone stream');
      return;
    }

    // 創建只包含音訊的 MediaStream
    const audioStream = new MediaStream([audioTrack]);

    this.microphoneSource = this.audioContext.createMediaStreamSource(audioStream);
    this.microphoneGain = this.audioContext.createGain();
    this.microphoneGain.gain.value = this.microphoneMuted ? 0 : this.microphoneVolume;

    this.microphoneSource.connect(this.microphoneGain);
    this.microphoneGain.connect(this.destination);
  }

  /**
   * 移除麥克風音訊來源
   */
  removeMicrophone(): void {
    if (this.microphoneSource) {
      this.microphoneSource.disconnect();
      this.microphoneSource = null;
    }
    if (this.microphoneGain) {
      this.microphoneGain.disconnect();
      this.microphoneGain = null;
    }
  }

  /**
   * 添加系統音訊來源（來自 desktopCapturer）
   */
  addSystemAudio(stream: MediaStream): void {
    // 如果已經有系統音訊來源，先移除
    this.removeSystemAudio();

    const audioTrack = stream.getAudioTracks()[0];
    if (!audioTrack) {
      console.warn('No audio track found in system audio stream');
      return;
    }

    const audioStream = new MediaStream([audioTrack]);

    this.systemAudioSource = this.audioContext.createMediaStreamSource(audioStream);
    this.systemAudioGain = this.audioContext.createGain();
    this.systemAudioGain.gain.value = this.systemAudioMuted ? 0 : this.systemAudioVolume;

    this.systemAudioSource.connect(this.systemAudioGain);
    this.systemAudioGain.connect(this.destination);
  }

  /**
   * 移除系統音訊來源
   */
  removeSystemAudio(): void {
    if (this.systemAudioSource) {
      this.systemAudioSource.disconnect();
      this.systemAudioSource = null;
    }
    if (this.systemAudioGain) {
      this.systemAudioGain.disconnect();
      this.systemAudioGain = null;
    }
  }

  /**
   * 設置麥克風音量 (0-1)
   */
  setMicrophoneVolume(volume: number): void {
    this.microphoneVolume = Math.max(0, Math.min(1, volume));
    if (this.microphoneGain && !this.microphoneMuted) {
      this.microphoneGain.gain.setValueAtTime(
        this.microphoneVolume,
        this.audioContext.currentTime
      );
    }
  }

  /**
   * 設置系統音訊音量 (0-1)
   */
  setSystemAudioVolume(volume: number): void {
    this.systemAudioVolume = Math.max(0, Math.min(1, volume));
    if (this.systemAudioGain && !this.systemAudioMuted) {
      this.systemAudioGain.gain.setValueAtTime(
        this.systemAudioVolume,
        this.audioContext.currentTime
      );
    }
  }

  /**
   * 切換麥克風靜音
   */
  toggleMicrophoneMute(): boolean {
    this.microphoneMuted = !this.microphoneMuted;
    if (this.microphoneGain) {
      this.microphoneGain.gain.setValueAtTime(
        this.microphoneMuted ? 0 : this.microphoneVolume,
        this.audioContext.currentTime
      );
    }
    return this.microphoneMuted;
  }

  /**
   * 設置麥克風靜音狀態
   */
  setMicrophoneMute(muted: boolean): void {
    this.microphoneMuted = muted;
    if (this.microphoneGain) {
      this.microphoneGain.gain.setValueAtTime(
        muted ? 0 : this.microphoneVolume,
        this.audioContext.currentTime
      );
    }
  }

  /**
   * 切換系統音訊靜音
   */
  toggleSystemAudioMute(): boolean {
    this.systemAudioMuted = !this.systemAudioMuted;
    if (this.systemAudioGain) {
      this.systemAudioGain.gain.setValueAtTime(
        this.systemAudioMuted ? 0 : this.systemAudioVolume,
        this.audioContext.currentTime
      );
    }
    return this.systemAudioMuted;
  }

  /**
   * 設置系統音訊靜音狀態
   */
  setSystemAudioMute(muted: boolean): void {
    this.systemAudioMuted = muted;
    if (this.systemAudioGain) {
      this.systemAudioGain.gain.setValueAtTime(
        muted ? 0 : this.systemAudioVolume,
        this.audioContext.currentTime
      );
    }
  }

  /**
   * 獲取混合後的音訊流
   */
  getOutputStream(): MediaStream {
    return this.destination.stream;
  }

  /**
   * 獲取當前狀態
   */
  getStatus(): {
    microphoneConnected: boolean;
    microphoneMuted: boolean;
    microphoneVolume: number;
    systemAudioConnected: boolean;
    systemAudioMuted: boolean;
    systemAudioVolume: number;
  } {
    return {
      microphoneConnected: this.microphoneSource !== null,
      microphoneMuted: this.microphoneMuted,
      microphoneVolume: this.microphoneVolume,
      systemAudioConnected: this.systemAudioSource !== null,
      systemAudioMuted: this.systemAudioMuted,
      systemAudioVolume: this.systemAudioVolume,
    };
  }

  /**
   * 釋放所有資源
   */
  dispose(): void {
    this.removeMicrophone();
    this.removeSystemAudio();

    if (this.audioContext.state !== 'closed') {
      this.audioContext.close();
    }
  }
}
