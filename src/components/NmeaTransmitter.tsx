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
  Cpu,
  ExternalLink,
  Globe,
  HelpCircle,
  CheckCircle2
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
  const [showChromeGuidance, setShowChromeGuidance] = useState<boolean>(false);

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
      // Show Chrome guidance popup if WebUSB/WebSerial is not supported in current environment
      if (!serialService.isWebUsbSupported() && !serialService.isWebSerialSupported()) {
        setShowChromeGuidance(true);
      } else if (err.name !== 'NotFoundError' && !err.message?.includes('No device selected')) {
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
      if (!serialService.isWebUsbSupported()) {
        setShowChromeGuidance(true);
      } else if (err.name !== 'NotFoundError' && !err.message?.includes('No device selected')) {
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
      if (!serialService.isWebSerialSupported()) {
        setShowChromeGuidance(true);
      } else if (err.name !== 'NotFoundError' && !err.message?.includes('No device selected')) {
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
    onConfigChange({ ...config, activeSentences: {} });
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

              {/* Chrome OTG Guide Button */}
              <button
                type="button"
                onClick={() => setShowChromeGuidance(true)}
                title="View Chrome Offline USB Connection Instructions"
                className="p-2.5 rounded-lg bg-slate-800 hover:bg-slate-750 text-cyan-400 border border-slate-700"
              >
                <Globe className="w-4 h-4" />
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

      {/* Chrome Offline Hardware Guidance Modal / Alert */}
      {showChromeGuidance && (
        <div className="p-4 bg-slate-950 border border-cyan-500/50 rounded-xl shadow-xl flex flex-col gap-3 animate-fadeIn">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2.5 text-cyan-300 font-bold text-sm">
              <Globe className="w-5 h-5 text-cyan-400" />
              <span>Direct USB Hardware Connection Notice</span>
            </div>
            <button
              type="button"
              onClick={() => setShowChromeGuidance(false)}
              className="text-xs text-slate-400 hover:text-white px-2 py-1 bg-slate-850 rounded"
            >
              Dismiss
            </button>
          </div>

          <p className="text-xs text-slate-300 leading-relaxed font-sans">
            To connect physical USB OTG adapters (CH340 / CP2102 / FTDI / MAX485) with full hardware baud rate access:
          </p>

          <div className="p-3 bg-slate-900 rounded-lg border border-slate-800 text-xs font-mono space-y-2 text-slate-200">
            <div className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span>Open <strong>Google Chrome</strong> on your Android phone/tablet (works 100% offline).</span>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span>Tap <strong>Menu (⋮) → "Add to Home screen"</strong> or <strong>"Install app"</strong> to launch as a standalone marine application.</span>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span>Chrome natively pairs with your USB serial converter via WebUSB / WebSerial without requiring internet.</span>
            </div>
          </div>
        </div>
      )}

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
            <p>2. For direct hardware port access, launch in <strong>Google Chrome</strong> (offline) and choose <strong>Add to Home screen</strong>.</p>
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
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-slate-400 font-medium">Baud Rate (bps)</label>
            <select
              disabled={serialStatus.connected}
              value={config.baudRate}
              onChange={(e) =>
                onConfigChange({ ...config, baudRate: Number(e.target.value) })
              }
              className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs font-mono font-bold text-cyan-300 outline-none disabled:opacity-50"
            >
              <option value={4800}>4800 (Standard Marine NMEA 0183)</option>
              <option value={9600}>9600 (Fast GPS / Heading)</option>
              <option value={38400}>38400 (High-Speed AIS / Radar)</option>
              <option value={115200}>115200 (Telemetry Stream)</option>
            </select>
          </div>

          {/* Output Frequency / Interval */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-slate-400 font-medium">Transmit Rate</label>
            <select
              value={config.intervalMs}
              onChange={(e) =>
                onConfigChange({ ...config, intervalMs: Number(e.target.value) })
              }
              className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs font-mono font-bold text-white outline-none"
            >
              <option value={100}>10 Hz (Fast Marine Autopilot / 100ms)</option>
              <option value={200}>5 Hz (Standard Heading / 200ms)</option>
              <option value={500}>2 Hz (General Marine / 500ms)</option>
              <option value={1000}>1 Hz (Standard NMEA GPS / 1000ms)</option>
            </select>
          </div>

          {/* Talker ID (GPS) */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-slate-400 font-medium">GNSS Talker ID</label>
            <select
              value={config.talkerIdGps}
              onChange={(e) =>
                onConfigChange({ ...config, talkerIdGps: e.target.value })
              }
              className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs font-mono font-bold text-white outline-none"
            >
              <option value="GP">GP (GPS Receiver)</option>
              <option value="GN">GN (Combined GNSS / Multi-Constellation)</option>
              <option value="GL">GL (GLONASS)</option>
              <option value="GA">GA (Galileo)</option>
            </select>
          </div>

          {/* Talker ID (Heading) */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-slate-400 font-medium">Heading Talker ID</label>
            <select
              value={config.talkerIdHeading}
              onChange={(e) =>
                onConfigChange({ ...config, talkerIdHeading: e.target.value })
              }
              className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs font-mono font-bold text-white outline-none"
            >
              <option value="HC">HC (Magnetic Compass Sensor)</option>
              <option value="HE">HE (North Seeking Gyro)</option>
              <option value="HN">HN (Non-North Seeking Gyro)</option>
              <option value="TI">TI (Turn Indicator)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Sentence Selection Matrix */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            Active NMEA 0183 Sentence Matrix
          </h3>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={selectAll}
              className="text-[11px] font-mono text-cyan-400 hover:text-cyan-300 underline"
            >
              Select All
            </button>
            <span className="text-slate-600">•</span>
            <button
              type="button"
              onClick={deselectAll}
              className="text-[11px] font-mono text-slate-400 hover:text-slate-300 underline"
            >
              Clear All
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {AVAILABLE_SENTENCES.map((item) => {
            const isActive = !!config.activeSentences[item.id];
            return (
              <div
                key={item.id}
                onClick={() => toggleSentence(item.id)}
                className={`p-3 rounded-xl border cursor-pointer select-none transition-all flex items-start gap-3 ${
                  isActive
                    ? 'bg-slate-900 border-cyan-500/50 shadow-md'
                    : 'bg-slate-900/40 border-slate-800 opacity-60 hover:opacity-90'
                }`}
              >
                <div
                  className={`w-5 h-5 rounded flex items-center justify-center mt-0.5 shrink-0 ${
                    isActive
                      ? 'bg-cyan-500 text-slate-950'
                      : 'border border-slate-600 bg-slate-800'
                  }`}
                >
                  {isActive && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                </div>

                <div className="flex flex-col">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-sm text-white">{item.id}</span>
                    <span
                      className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase ${
                        item.category === 'heading'
                          ? 'bg-blue-950 text-blue-300 border border-blue-800'
                          : 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                      }`}
                    >
                      {item.category}
                    </span>
                  </div>
                  <span className="text-xs font-semibold text-slate-300 mt-0.5">{item.name}</span>
                  <p className="text-[11px] text-slate-400 leading-snug mt-1">{item.description}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Real-time NMEA Outflow Terminal Preview */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Output Payload Stream Preview (Live Calculated Checksums)
            </h3>
          </div>
          <span className="text-[10px] font-mono text-slate-500">
            {liveSentences.length} sentences generated
          </span>
        </div>

        <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 font-mono text-xs text-green-400 space-y-1.5 overflow-x-auto shadow-inner">
          {liveSentences.length > 0 ? (
            liveSentences.map((line, idx) => (
              <div key={idx} className="flex gap-2">
                <span className="text-slate-600 select-none">{String(idx + 1).padStart(2, '0')}</span>
                <span className="text-white font-bold">{line.substring(0, 6)}</span>
                <span className="text-emerald-300">{line.substring(6)}</span>
              </div>
            ))
          ) : (
            <div className="text-slate-500 italic">No active sentences selected in matrix.</div>
          )}
        </div>
      </div>
    </div>
  );
};
