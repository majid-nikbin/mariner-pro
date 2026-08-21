import React, { useState, useEffect } from 'react';
import { CompassData, GpsData, HeadingSource, NmeaConfig, SerialPortStatus } from './types';
import { useSensors } from './hooks/useSensors';
import { serialService } from './services/serialService';
import { getLicenseStatus, OFFICIAL_SUPPORT_EMAIL } from './services/licenseService';
import { Header, ActiveTab } from './components/Header';
import { CompassDial } from './components/CompassDial';
import { MarineGpsData } from './components/MarineGpsData';
import { NmeaTransmitter } from './components/NmeaTransmitter';
import { NmeaMonitor } from './components/NmeaMonitor';
import { UsbDriverGuide } from './components/UsbDriverGuide';
import { KeyGenTab } from './components/KeyGenTab';
import { ActivationModal } from './components/ActivationModal';
import { formatMarineDDM } from './utils/geo';
import { Radio } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('nav');
  const [headingSource, setHeadingSource] = useState<HeadingSource>('magnetic');
  const [isNightMode, setIsNightMode] = useState<boolean>(false);
  const [isActivated, setIsActivated] = useState<boolean>(() => getLicenseStatus().isActivated);

  // Default NMEA Output Configuration
  const [nmeaConfig, setNmeaConfig] = useState<NmeaConfig>({
    baudRate: 4800,
    intervalMs: 1000,
    talkerIdGps: 'GP',
    talkerIdHeading: 'HC',
    magVariation: 2.0,
    headingCorrection: 0.0,
    activeSentences: {
      HDG: true,
      HDT: true,
      HDM: false,
      THS: false,
      VHW: false,
      RMC: true,
      GGA: true,
      GLL: false,
      VTG: true,
      ZDA: false,
    },
  });

  // Serial status state from service
  const [serialStatus, setSerialStatus] = useState<SerialPortStatus>(serialService.getStatus());

  useEffect(() => {
    const unsub = serialService.subscribeStatus((status) => {
      setSerialStatus(status);
    });
    return () => unsub();
  }, []);

  // Sensor integration (Compass + GPS + Low-Pass Filter)
  const {
    compass,
    gps,
    hasRealGps,
    isGpsAcquiring,
    hasRealCompass,
    gpsError,
    gpsPermissionState,
    isManualHeading,
    dampingMode,
    setDampingMode,
    displayRefreshRate,
    setDisplayRefreshRate,
    setHeadingManual,
    resetToSensorHeading,
    requestCompassPermission,
    requestGpsFix,
    setGpsData,
  } = useSensors(nmeaConfig.magVariation, nmeaConfig.headingCorrection || 0);

  const handleSetManualGps = (lat: number, lon: number) => {
    setGpsData((prev) => ({
      ...prev,
      latitude: lat,
      longitude: lon,
      fixType: 'Simulated',
    }));
  };

  return (
    <div
      id="app-root"
      className={`min-h-screen flex flex-col transition-colors duration-200 ${
        isNightMode ? 'bg-[#090505] text-red-100' : 'bg-[#0F172A] text-slate-200'
      }`}
    >
      {/* Clean Marine Header Navigation */}
      <Header
        activeTab={activeTab}
        onTabChange={setActiveTab}
        serialStatus={serialStatus}
        hasRealGps={hasRealGps}
        hasRealCompass={hasRealCompass}
        isNightMode={isNightMode}
        onToggleNightMode={() => setIsNightMode(!isNightMode)}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 flex flex-col gap-6">
        {/* Tab 1: Navigation View (Compass Dial ~1/3 Screen + Marine GPS Lower Screen) */}
        {activeTab === 'nav' && (
          <div className="flex flex-col gap-6">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Compass Dial Section */}
              <div className="lg:col-span-5 w-full">
                <CompassDial
                  compass={compass}
                  gps={gps}
                  headingSource={headingSource}
                  onSourceChange={setHeadingSource}
                  hasRealCompass={hasRealCompass}
                  hasRealGps={hasRealGps}
                  isManualHeading={isManualHeading}
                  onManualHeadingChange={setHeadingManual}
                  onResetManual={resetToSensorHeading}
                  onRequestPermission={requestCompassPermission}
                  dampingMode={dampingMode}
                  onDampingChange={setDampingMode}
                  displayRefreshRate={displayRefreshRate}
                  onRefreshRateChange={setDisplayRefreshRate}
                  headingCorrection={nmeaConfig.headingCorrection || 0}
                  onHeadingCorrectionChange={(offset) => setNmeaConfig((prev) => ({ ...prev, headingCorrection: offset }))}
                  isNightMode={isNightMode}
                />
              </div>

              {/* Lower/Right: Marine GNSS / GPS Position Cluster */}
              <div className="lg:col-span-7 w-full flex flex-col gap-6">
                <MarineGpsData
                  gps={gps}
                  magVariation={nmeaConfig.magVariation}
                  hasRealGps={hasRealGps}
                  isGpsAcquiring={isGpsAcquiring}
                  gpsError={gpsError}
                  gpsPermissionState={gpsPermissionState}
                  onRequestGps={requestGpsFix}
                  onSetManualGps={handleSetManualGps}
                  isNightMode={isNightMode}
                />
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: NMEA 0183 Output (Transmitter Configuration & Sentences) */}
        {activeTab === 'transmit' && (
          <NmeaTransmitter
            gps={gps}
            compass={compass}
            config={nmeaConfig}
            onConfigChange={setNmeaConfig}
            serialStatus={serialStatus}
            isNightMode={isNightMode}
          />
        )}

        {/* Tab 3: NMEA 0183 Monitor (Live RX Stream & Decoder with USB connection) */}
        {activeTab === 'monitor' && (
          <NmeaMonitor
            serialStatus={serialStatus}
            isNightMode={isNightMode}
          />
        )}

        {/* Tab 4: USB OTG & Drivers Guide */}
        {activeTab === 'drivers' && (
          <UsbDriverGuide isNightMode={isNightMode} />
        )}

        {/* Tab 5: Developer Key Generator */}
        {activeTab === 'keygen' && (
          <KeyGenTab isNightMode={isNightMode} />
        )}
      </main>

      {/* Docked Marine Console Footer Bar */}
      <footer className="mt-auto bg-slate-900 border-t border-slate-700 px-4 sm:px-8 py-4 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-8 sm:gap-12 w-full md:w-auto justify-between sm:justify-start">
          <div className="flex flex-col">
            <span className="text-[10px] font-bold text-slate-500 uppercase mb-0.5 tracking-wider">
              Latitude
            </span>
            <span className="text-xl sm:text-2xl font-mono text-white font-bold tracking-tight">
              {formatMarineDDM(gps.latitude, false)}
            </span>
          </div>

          <div className="flex flex-col">
            <span className="text-[10px] font-bold text-slate-500 uppercase mb-0.5 tracking-wider">
              Longitude
            </span>
            <span className="text-xl sm:text-2xl font-mono text-white font-bold tracking-tight">
              {formatMarineDDM(gps.longitude, true)}
            </span>
          </div>

          <div className="flex flex-col">
            <span className="text-[10px] font-bold text-slate-500 uppercase mb-0.5 tracking-wider">
              Altitude
            </span>
            <span className="text-xl sm:text-2xl font-mono text-slate-300 font-bold tracking-tight">
              {gps.altitude !== null ? `${gps.altitude.toFixed(1)}m` : '---.-m'}{' '}
              <span className="text-xs text-slate-500 font-normal">MSL</span>
            </span>
          </div>
        </div>

        <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-end">
          <div className="flex flex-col items-start md:items-end">
            <div className="text-[10px] font-bold text-slate-500 uppercase mb-1 tracking-wider">
              GNSS Receiver & Hardware Bus
            </div>
            <div className="flex items-center gap-2">
              <div className={`px-2.5 py-1 rounded text-xs font-bold font-mono flex items-center gap-1.5 border ${
                hasRealGps 
                  ? 'bg-emerald-950/80 border-emerald-500/50 text-emerald-300' 
                  : 'bg-amber-950/80 border-amber-500/50 text-amber-300'
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${hasRealGps ? 'bg-emerald-400' : 'bg-amber-400'} animate-pulse`} />
                <span>{hasRealGps ? 'GPS: LOCKED' : 'GPS: SEARCHING'}</span>
              </div>

              <div className="px-2.5 py-1 bg-slate-800 border border-slate-700 rounded text-slate-300 text-xs font-bold font-mono">
                {serialStatus.connected ? 'USB: ACTIVE' : 'USB: STANDBY'}
              </div>
            </div>
          </div>
        </div>
      </footer>

      {/* Device License / First Time Activation Modal */}
      {!isActivated && (
        <ActivationModal 
          developerEmail={OFFICIAL_SUPPORT_EMAIL}
          onActivated={() => setIsActivated(true)} 
        />
      )}
    </div>
  );
}
