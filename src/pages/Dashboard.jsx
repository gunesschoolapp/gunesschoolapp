import React, { useState, useEffect } from 'react';
import { useCurrentUser } from '@/lib/useCurrentUser';
import AppLauncher from '@/components/AppLauncher';
import { Cloud, Sun, CloudRain, CloudSnow, CloudLightning, Wind, Droplets } from 'lucide-react';

const WMO_CODES = {
  0:  { en: 'Clear',           icon: Sun },
  1:  { en: 'Mostly Clear',    icon: Sun },
  2:  { en: 'Partly Cloudy',   icon: Cloud },
  3:  { en: 'Overcast',        icon: Cloud },
  45: { en: 'Foggy',           icon: Cloud },
  48: { en: 'Freezing Fog',    icon: Cloud },
  51: { en: 'Light Drizzle',   icon: CloudRain },
  53: { en: 'Drizzle',         icon: CloudRain },
  55: { en: 'Heavy Drizzle',   icon: CloudRain },
  61: { en: 'Light Rain',      icon: CloudRain },
  63: { en: 'Rain',            icon: CloudRain },
  65: { en: 'Heavy Rain',      icon: CloudRain },
  71: { en: 'Light Snow',      icon: CloudSnow },
  73: { en: 'Snow',            icon: CloudSnow },
  75: { en: 'Heavy Snow',      icon: CloudSnow },
  80: { en: 'Showers',         icon: CloudRain },
  81: { en: 'Showers',         icon: CloudRain },
  82: { en: 'Heavy Showers',   icon: CloudRain },
  95: { en: 'Thunderstorm',    icon: CloudLightning },
  96: { en: 'Thunderstorm (Hail)', icon: CloudLightning },
  99: { en: 'Heavy Thunderstorm', icon: CloudLightning },
};

function WeatherWidget() {
  const [weather, setWeather] = useState(null);

  useEffect(() => {
    fetch('https://api.open-meteo.com/v1/forecast?latitude=51.5074&longitude=-0.1278&current=temperature_2m,relative_humidity_2m,wind_speed_10m,weathercode&timezone=Europe/London')
      .then(r => r.json())
      .then(data => {
        const c = data.current;
        setWeather({
          temp: Math.round(c.temperature_2m),
          humidity: c.relative_humidity_2m,
          wind: Math.round(c.wind_speed_10m),
          code: c.weathercode,
        });
      })
      .catch(() => {});
  }, []);

  if (!weather) return (
    <div className="text-sm text-muted-foreground animate-pulse">
      Loading weather...
    </div>
  );

  const info = WMO_CODES[weather.code] || { en: 'Unknown', icon: Cloud };
  const WeatherIcon = info.icon;

  return (
    <div className="flex items-center gap-3 bg-white/60 dark:bg-white/5 backdrop-blur-sm border border-border/40 rounded-2xl px-4 py-2.5 shadow-sm">
      <WeatherIcon className="w-6 h-6 text-sky-500 flex-shrink-0" />
      <div>
        <p className="text-xs text-muted-foreground font-medium">London</p>
        <div className="flex items-center gap-2">
          <span className="text-lg font-black text-foreground">{weather.temp}°C</span>
          <span className="text-xs text-muted-foreground">{info.en}</span>
        </div>
      </div>
      <div className="flex flex-col items-end text-xs text-muted-foreground gap-0.5 ml-2">
        <span className="flex items-center gap-1"><Droplets className="w-3 h-3" />{weather.humidity}%</span>
        <span className="flex items-center gap-1"><Wind className="w-3 h-3" />{weather.wind} km/h</span>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { user, hasPerm } = useCurrentUser();

  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <div className="space-y-6 pb-24 sm:pb-0">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="flex-1">
          <h1 className="text-3xl lg:text-4xl font-black tracking-tight text-foreground">
            {greeting()}{user ? `, ${user.full_name?.split(' ')[0] || ''}` : ''} 👋
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            What would you like to do today?
          </p>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          <WeatherWidget />
        </div>
      </div>

      {/* App Launcher */}
      <div className="bg-card rounded-2xl border border-border/50 shadow-sm p-4 sm:p-6">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">
          Applications
        </p>
        <AppLauncher userRole={user?.matched_role || user?.role} hasPerm={hasPerm} />
      </div>
    </div>
  );
}