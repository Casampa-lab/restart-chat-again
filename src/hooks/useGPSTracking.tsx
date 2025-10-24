import { useState, useEffect, useCallback } from 'react';
import { Geolocation } from '@capacitor/geolocation';
import { Capacitor } from '@capacitor/core';
import { toast } from 'sonner';

interface GPSPosition {
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: number;
}

export function useGPSTracking() {
  const [position, setPosition] = useState<GPSPosition | null>(null);
  const [watching, setWatching] = useState(false);
  const [watchId, setWatchId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const startWatching = useCallback(async () => {
    try {
      // Verificar permissões
      const permission = await Geolocation.checkPermissions();
      
      if (permission.location !== 'granted') {
        const request = await Geolocation.requestPermissions();
        if (request.location !== 'granted') {
          throw new Error('Permissão de localização negada');
        }
      }

      // Iniciar rastreamento
      const id = await Geolocation.watchPosition(
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        },
        (position, err) => {
          if (err) {
            console.error('Erro GPS:', err);
            setError(err.message);
            toast.error('Erro ao capturar GPS: ' + err.message);
            return;
          }

          if (position) {
            setPosition({
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
              accuracy: position.coords.accuracy,
              timestamp: position.timestamp,
            });
            setError(null);
          }
        }
      );

      setWatchId(id);
      setWatching(true);
      toast.success('Rastreamento GPS ativado');
    } catch (err: any) {
      console.error('Erro ao iniciar rastreamento:', err);
      setError(err.message);
      toast.error('Erro ao iniciar GPS: ' + err.message);
    }
  }, []);

  const stopWatching = useCallback(async () => {
    if (watchId) {
      await Geolocation.clearWatch({ id: watchId });
      setWatchId(null);
      setWatching(false);
      toast.info('Rastreamento GPS desativado');
    }
  }, [watchId]);

  const getCurrentPosition = useCallback(async (): Promise<GPSPosition | null> => {
    try {
      // Se estiver na web, usar API nativa do navegador
      if (!Capacitor.isNativePlatform()) {
        return new Promise((resolve, reject) => {
          if (!navigator.geolocation) {
            reject(new Error('Geolocalização não suportada neste navegador'));
            return;
          }

          navigator.geolocation.getCurrentPosition(
            (position) => {
              const gpsPos: GPSPosition = {
                latitude: position.coords.latitude,
                longitude: position.coords.longitude,
                accuracy: position.coords.accuracy,
                timestamp: position.timestamp,
              };
              setPosition(gpsPos);
              setError(null);
              resolve(gpsPos);
            },
            (error) => {
              setError(error.message);
              toast.error(`Erro ao capturar GPS: ${error.message}. Permita acesso à localização no navegador.`);
              reject(error);
            },
            {
              enableHighAccuracy: true,
              timeout: 10000,
              maximumAge: 0,
            }
          );
        });
      }

      // Se for nativo, usar Capacitor
      const permission = await Geolocation.checkPermissions();
      
      if (permission.location !== 'granted') {
        const request = await Geolocation.requestPermissions();
        if (request.location !== 'granted') {
          throw new Error('Permissão de localização negada');
        }
      }

      const position = await Geolocation.getCurrentPosition({
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      });

      const gpsPos: GPSPosition = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy,
        timestamp: position.timestamp,
      };

      setPosition(gpsPos);
      setError(null);
      return gpsPos;
    } catch (err: any) {
      console.error('Erro ao obter posição:', err);
      setError(err.message);
      toast.error(`Erro ao capturar GPS: ${err.message}. ${
        Capacitor.isNativePlatform() 
          ? 'Verifique as permissões do app.' 
          : 'Permita acesso à localização no navegador.'
      }`);
      return null;
    }
  }, []);

  useEffect(() => {
    return () => {
      if (watchId) {
        Geolocation.clearWatch({ id: watchId });
      }
    };
  }, [watchId]);

  return {
    position,
    watching,
    error,
    startWatching,
    stopWatching,
    getCurrentPosition,
  };
}
