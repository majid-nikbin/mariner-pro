import React, { useState, useEffect } from 'react';
import { 
  Cable, 
  Play, 
  Square, 
  Radio, 
  Zap, 
  AlertCircle,
  SlidersHorizontal,
  Compass,
  MapPin,
  Check,
  Usb,
  Cpu
} from 'lucide-react';
import { CompassData, GpsData, NmeaConfig, SerialPortStatus } from '../types';
import { AVAILABLE_SENTENCES, generateNmeaSentences } from '../utils/nmea';
import { serialService } from '../services/serialService';

interface NmeaTransmitterProps {
  gps: GpsData;
  compass: CompassData;
  config: NmeaConfig;
  onConfigChange: (newConfig: NmeaConfig) => void;
  serialStatus: SerialPortStatus;
  isNightMode?: boolean;
}

export const NmeaTransmitter: React.FC<NmeaTransmitterProps> = ({
  gps,
  compass,
  config,
  onConfigChange,
  serialStatus,
  isNightMode = false,
}) => {
  const [isTransmitting, setIsTransmitting] = useState<boolean>(false);
  const [liveSentences, setLiveSentences] = useState<string[]>([]);
  const [isConnecting, setIsConnecting] = useState<boolean>(false);
  const [connectError, setConnectError] = useState<string | null>(null);

  // Generate real-time preview of sentences
  useEffect(() => {
    const generated = generateNmeaSentences(gps, compass, config);
    setLiveSentences(generated);
  }, [gps, compass, config]);

  // Transmit interval loop when enabled & port connected
  useEffect(() => {
    if (!isTransmitting || !serialStatus.connected) return;

    const interval = setInterval(async () => {
      const sentences = generateNmeaSentences(gps, compass, config);
      await serialService.writeSentences(sentences);
    }, config.intervalMs);

    return () => clearInterval(interval);
  }, [isTransmitting, serialStatus.connected, gps, compass, config]);

  // Smart Auto-Connect for USB OTG (Auto tries WebUSB with fallback to WebSerial)
  const handleConnectAutoUsb = async () => {
    setIsConnecting(true);
    setConnectError(null);
    try {
      await serialService.connect(config.baudRate);
      setIsTransmitting(true);
    } catch (err: any) {
      console.warn('USB Connection issue:', err);
      if (err.name !== 'NotFoundError' && !err.message?.includes('No device selected')) {
        setConnectError(err?.message || 'USB OTG connection failed.');
      }
    } finally {
      setIsConnecting(false);
    }
  };

  // Connect via WebUSB (Direct driver for Android OTG & MAX485/CH340 dongles)
  const handleConnectWebUsb = async () => {
    setIsConnecting(true);
    setConnectError(null);
    try {
      await serialService.connectWebUsb(config.baudRate);
      setIsTransmitting(true);
    } catch (err: any) {
      console.warn('WebUSB Connection issue:', err);
      if (err.name !== 'NotFoundError' && !err.message?.includes('No device selected')) {
        setConnectError(err?.message || 'WebUSB connection failed.');
      }
    } finally {
      setIsConnecting(false);
    }
  };

  // Connect via Web Serial API (Desktop or standard CDC ACM)
  const handleConnectWebSerial = async () => {
    setIsConnecting(true);
    setConnectError(null);
    try {
      await serialService.connectWebSerial(config.baudRate);
      setIsTransmitting(true);
    } catch (err: any) {
      console.warn('WebSerial Connection issue:', err);
      if (err.name !== 'NotFoundError' && !err.message?.includes('No device selected')) {
        setConnectError(err?.message || 'WebSerial connection failed.');
      }
    } finally {
      setIsConnecting(false);
    }
  };

  const handleConnectSimulator = () => {
    serialService.connectSimulated(config.baudRate);
    setIsTransmitting(true);
    setConnectError(null);
  };

  const handleDisconnect = async () => {
    setIsTransmitting(false);
    await serialService.disconnect();
  };

  const toggleSentence = (id: string) => {
    const current = !!config.activeSentences[id];
    onConfigChange({
      ...config,
      activeSentences: {
        ...config.activeSentences,
        [id]: !current,
      },
    });
  };

  const selectAll = () => {
    const next: Record<string, boolean> = {};
    AVAILABLE_SENTENCES.forEach((s) => {
      next[s.id] = true;
    });
    onConfigChange({ ...config, activeSentences: next });
  };

  const deselectAll = () => {
    const next: Record<string, boolean> = {};
    AVAILABLE_SENTENCES.forEach((s) => {
      next[s.id] = false;
    });
    onConfigChange({ ...config, activeSentences: next });
  };

  return (
    <div
      id="nmea-transmitter-panel"
      className={`p-6 rounded-2xl border transition-all flex flex-col gap-6 ${
        isNightMode
          ? 'bg-zinc-950/80 border-red-900/50 text-red-100 shadow-xl'
          : 'bg-slate-800/40 border-slate-700 text-slate-200 shadow-xl'
      }`}
    >
      {/* Header & Status Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 bg-slate-900 rounded-xl border border-slate-700">
        <div className="flex items-center gap-3.5">
          <div
            className={`w-10 h-10 rounded-lg flex items-center justify-center ${
              serialStatus.connected
                ? isNightMode
                  ? 'bg-red-700 text-white'
                  : 'bg-cyan-600 text-white shadow-[0_0_12px_rgba(34,211,238,0.4)]'
                : 'bg-slate-800 text-slate-400 border border-slate-700'
            }`}
          >
            <Cable className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                USB OTG Port Controller
              </h2>
              <span
                className={`px-2 py-0.5 text-[10px] font-bold rounded uppercase tracking-widest ${
                  serialStatus.connected
                    ? 'bg-green-900/30 border border-green-500/50 text-green-400'
                    : 'bg-slate-800 text-slate-400 border border-slate-700'
                }`}
              >
                {serialStatus.connected
                  ? serialStatus.isSimulated
                    ? 'SIMULATED OTG ACTIVE'
                    : 'USB HARDWARE CONNECTED'
                  : 'STANDBY'}
              </span>
            </div>
            <p className="text-xs text-slate-400 font-mono mt-0.5">
              {serialStatus.connected
                ? `${serialStatus.driverType || 'Serial Device'} • ${serialStatus.baudRate} bps • ${serialStatus.sentencesSent} packets sent`
                : 'Plug MAX485 / CH340 / CP2102 / FTDI dongle into phone OTG port'}
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          {!serialStatus.connected ? (
            <>
              {/* Auto USB OTG (Smart WebUSB/Serial connection) */}
              <button
                id="btn-connect-autousb"
                type="button"
                onClick={handleConnectAutoUsb}
                disabled={isConnecting}
                title="Connect via OTG Cable & Port (Auto CH340, CP2102, FTDI, MAX485)"
                className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-bold rounded-lg transition-all shadow-md ${
                  isNightMode
                    ? 'bg-red-700 hover:bg-red-600 text-white'
                    : 'bg-cyan-600 hover:bg-cyan-500 text-white shadow-[0_0_15px_rgba(34,211,238,0.3)]'
                }`}
              >
                <Usb className="w-4 h-4" />
                <span>{isConnecting ? 'Connecting...' : 'Connect USB OTG'}</span>
              </button>

              {/* WebUSB Direct */}
              <button
                id="btn-connect-webusb"
                type="button"
                onClick={handleConnectWebUsb}
                disabled={isConnecting}
                title="Connect directly via WebUSB driver (CH340/MAX485/FTDI)"
                className="px-3 py-2.5 text-xs font-bold rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 flex items-center gap-1.5"
              >
                <span>WebUSB</span>
              </button>

              {/* Simulator */}
              <button
                id="btn-connect-simulator"
                type="button"
                onClick={handleConnectSimulator}
                title="Simulate NMEA output stream without physical cable"
                className="px-3 py-2.5 text-xs font-bold rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 border border-slate-700"
              >
                Simulator
              </button>
            </>
          ) : (
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                id="btn-toggle-tx"
                type="button"
                onClick={() => setIsTransmitting(!isTransmitting)}
                className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-2.5 text-xs font-bold rounded-lg transition-all ${
                  isTransmitting
                    ? 'bg-green-600 hover:bg-green-500 text-white shadow-lg shadow-green-950/50'
                    : 'bg-amber-600 hover:bg-amber-500 text-white'
                }`}
              >
                {isTransmitting ? <Radio className="w-4 h-4 animate-pulse" /> : <Play className="w-4 h-4" />}
                <span>{isTransmitting ? 'TX Streaming Active' : 'Start TX Stream'}</span>
              </button>

              <button
                id="btn-disconnect-usb"
                type="button"
                onClick={handleDisconnect}
                className="px-4 py-2.5 text-xs font-bold rounded-lg bg-rose-950/60 border border-rose-800 text-rose-300 hover:bg-rose-900"
              >
                Disconnect
              </button>
            </div>
          )}
        </div>
      </div>

      {connectError && (
        <div className="flex flex-col gap-2 p-3.5 bg-slate-900 border border-amber-500/40 rounded-xl text-xs text-amber-300">
          <div className="flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
            <div className="flex-1 font-mono">
              <span className="font-bold">USB Driver Message: </span>
              {connectError}
            </div>
          </div>
          <div className="p-2.5 bg-slate-950/80 rounded-lg border border-slate-800 text-[11px] text-slate-300 space-y-1">
            <p className="font-bold text-cyan-400">💡 Quick Android Connection Guide:</p>
            <p>1. Ensure USB OTG adapter is firmly plugged into the phone. On Xiaomi / Realme / Oppo devices, enable <strong>OTG Connection</strong> in phone system settings.</p>
            <p>2. For native real-time hardware transmission, launch in <strong>Google Chrome</strong> and choose <strong>Add to Home screen</strong>.</p>
          </div>
        </div>
      )}

      {/* Interface Configuration Grid */}
      <div className="flex flex-col gap-4">
        <div className="flex justify-between items-center">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            Interface Configuration
          </h3>
          <div className="text-[10px] text-slate-500 uppercase font-mono">
            Standard: IEC 61162-1
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          {/* Baud Rate */}
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-slate-500 uppercase">
              Baud Rate (USB/Serial)
            </label>
            <select
              id="select-baud-rate"
              value={config.baudRate}
              disabled={serialStatus.connected}
              onChange={(e) => onConfigChange({ ...config, baudRate: Number(e.target.value) })}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-sm text-slate-200 focus:ring-1 focus:ring-cyan-500 outline-none disabled:opacity-60 font-mono"
            >
              <option value={4800}>4800 bps (Standard NMEA)</option>
              <option value={9600}>9600 bps</option>
              <option value={19200}>19200 bps</option>
              <option value={38400}>38400 bps (AIS High-speed)</option>
              <option value={57600}>57600 bps</option>
              <option value={115200}>115200 bps</option>
            </select>
          </div>

          {/* Magnetic Heading Offset / Correction */}
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-amber-400 uppercase flex justify-between">
              <span>Heading Correction</span>
              <span className="font-mono text-cyan-300">
                {(config.headingCorrection || 0) > 0 ? `+${(config.headingCorrection || 0).toFixed(1)}°` : `${(config.headingCorrection || 0).toFixed(1)}°`}
              </span>
            </label>
            <div className="flex items-center gap-1">
              <input
                type="number"
                step="0.5"
                value={config.headingCorrection ?? 0}
                onChange={(e) => onConfigChange({ ...config, headingCorrection: parseFloat(e.target.value) || 0 })}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-cyan-300 font-mono focus:ring-1 focus:ring-cyan-500 outline-none"
                placeholder="0.0"
              />
            </div>
          </div>

          {/* Magnetic Variation */}
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-slate-500 uppercase flex justify-between">
              <span>Mag Variation</span>
              <span className="font-mono text-slate-400">
                {config.magVariation >= 0 ? `+${config.magVariation.toFixed(1)}°E` : `${config.magVariation.toFixed(1)}°W`}
              </span>
            </label>
            <input
              type="number"
              step="0.1"
              value={config.magVariation}
              onChange={(e) => onConfigChange({ ...config, magVariation: parseFloat(e.target.value) || 0 })}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 font-mono focus:ring-1 focus:ring-cyan-500 outline-none"
              placeholder="0.0"
            />
          </div>

          {/* Broadcast Frequency */}
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-slate-500 uppercase">
              Broadcast Frequency
            </label>
            <select
              id="select-interval-rate"
              value={config.intervalMs}
              onChange={(e) => onConfigChange({ ...config, intervalMs: Number(e.target.value) })}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-sm text-slate-200 focus:ring-1 focus:ring-cyan-500 outline-none font-mono"
            >
              <option value={1000}>1 Hz (1.0 sec - Standard GPS)</option>
              <option value={500}>2 Hz (500 ms)</option>
              <option value={200}>5 Hz (200 ms - Fast Heading)</option>
              <option value={100}>10 Hz (100 ms - Gyro Repeater)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Selected NMEA Sentences Grid matching Professional Polish theme */}
      <div className="flex flex-col gap-3">
        <div className="flex justify-between items-center">
          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
            Selected NMEA Sentences
          </label>
          <div className="flex items-center gap-2 text-xs">
            <button
              type="button"
              onClick={selectAll}
              className="text-cyan-400 hover:underline text-[11px] font-bold"
            >
              Select All
            </button>
            <span className="text-slate-600">•</span>
            <button
              type="button"
              onClick={deselectAll}
              className="text-slate-400 hover:underline text-[11px]"
            >
              Clear
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2.5">
          {AVAILABLE_SENTENCES.map((s) => {
            const active = !!config.activeSentences[s.id];
            const prefix = s.category === 'heading' ? config.talkerIdHeading : config.talkerIdGps;
            return (
              <div
                key={s.id}
                onClick={() => toggleSentence(s.id)}
                className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                  active
                    ? 'bg-slate-900 border-slate-700 text-white shadow-sm'
                    : 'bg-slate-900/60 border-slate-700 opacity-50 text-slate-400 hover:opacity-75'
                }`}
              >
                <div
                  className={`w-4 h-4 rounded border flex items-center justify-center text-[10px] font-bold shrink-0 ${
                    active
                      ? 'border-cyan-500 bg-cyan-900/30 text-cyan-400'
                      : 'border-slate-600'
                  }`}
                >
                  {active && '✓'}
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-mono font-bold truncate">
                    ${prefix}{s.id}
                  </div>
                  <div className="text-[10px] text-slate-500 truncate">
                    {s.name.split('(')[0]}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Live NMEA 0183 Stream Monitor Box matching Professional Polish theme */}
      <div className="h-60 bg-[#020617] rounded-2xl border border-slate-700 flex flex-col p-4 shadow-inner">
        <div className="flex justify-between items-center mb-2 px-2">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
            NMEA Data Stream Preview
          </span>
          <span className="text-[10px] font-mono text-cyan-500 uppercase font-bold">
            Live Stream {config.baudRate}baud • {config.intervalMs === 1000 ? '1Hz' : `${1000 / config.intervalMs}Hz`}
          </span>
        </div>
        <div className="flex-1 font-mono text-[11px] text-green-500 overflow-y-auto leading-relaxed opacity-90 p-2 bg-black/40 rounded-lg border border-slate-800">
          {liveSentences.length > 0 ? (
            liveSentences.map((s, idx) => (
              <div key={idx} className="whitespace-pre">
                {s.trim()}
              </div>
            ))
          ) : (
            <div className="text-slate-600 italic">No sentences enabled. Click sentences above to broadcast.</div>
          )}
        </div>
      </div>
    </div>
  );
};
