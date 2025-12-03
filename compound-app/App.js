import React, { useState, useRef } from 'react';
import { View, Text, Button, ActivityIndicator, Alert, ScrollView } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Video } from 'expo-av';

const SERVER_URL = 'http://192.168.68.54:3000'; // adapte si besoin

export default function App() {
  const [videoLocal, setVideoLocal] = useState(null);          // vidéo choisie sur le tel
  const [processedVideoUrl, setProcessedVideoUrl] = useState(null); // vidéo montée (backend)
  const [subtitles, setSubtitles] = useState([]);              // segments Whisper
  const [currentSubtitle, setCurrentSubtitle] = useState('');  // texte affiché
  const [uploading, setUploading] = useState(false);

  const videoRef = useRef(null);

  const pickVideo = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Videos,
      allowsEditing: false,
      quality: 1,
    });

    if (!result.canceled) {
      setVideoLocal(result.assets[0]);
      setProcessedVideoUrl(null);
      setSubtitles([]);
      setCurrentSubtitle('');
    }
  };

  const uploadVideo = async () => {
    if (!videoLocal) {
      Alert.alert('Aucune vidéo', 'Choisis une vidéo d’abord.');
      return;
    }

    try {
      setUploading(true);

      const formData = new FormData();
      formData.append('file', {
        uri: videoLocal.uri,
        name: 'video.mp4',
        type: 'video/mp4',
      });

      const res = await fetch(`${SERVER_URL}/upload`, {
        method: 'POST',
        body: formData,
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (!res.ok) {
        throw new Error('Erreur serveur');
      }

      const json = await res.json();
      console.log('Réponse serveur :', json);

      setUploading(false);
      setProcessedVideoUrl(json.processedVideoUrl);
      setSubtitles(json.subtitles || []);
      setCurrentSubtitle('');
    } catch (e) {
      console.error(e);
      setUploading(false);
      Alert.alert('Erreur', "Impossible d'envoyer la vidéo.");
    }
  };

  // ✨ Callback appelé en continu pendant la lecture
  const handlePlaybackStatusUpdate = (status) => {
    if (!status.isLoaded || !subtitles.length) return;

    const currentTimeSec = status.positionMillis / 1000;

    // On cherche le segment dont le start/end encadre la position
    const active = subtitles.find(
      (seg) => currentTimeSec >= seg.start && currentTimeSec <= seg.end
    );

    if (active) {
      if (active.text !== currentSubtitle) {
        setCurrentSubtitle(active.text);
      }
    } else {
      if (currentSubtitle !== '') {
        setCurrentSubtitle('');
      }
    }
  };

  return (
    <ScrollView
      contentContainerStyle={{
        flexGrow: 1,
        paddingTop: 80,
        paddingHorizontal: 16,
        backgroundColor: '#fff',
      }}
    >
      <Text style={{ fontSize: 20, fontWeight: 'bold', marginBottom: 16 }}>
        Test vidéo + sous-titres
      </Text>

      <Button title="Choisir une vidéo" onPress={pickVideo} />

      {videoLocal && !processedVideoUrl && (
        <View style={{ marginTop: 16 }}>
          <Text>Prévisualisation locale :</Text>
          <Video
            source={{ uri: videoLocal.uri }}
            style={{
              width: '100%',
              height: 220,
              backgroundColor: '#000',
              marginTop: 8,
            }}
            useNativeControls
            resizeMode="contain"
          />
        </View>
      )}

      <View style={{ marginTop: 24 }}>
        {uploading ? (
          <View style={{ alignItems: 'center' }}>
            <ActivityIndicator size="large" />
            <Text style={{ marginTop: 8 }}>Envoi + traitement en cours...</Text>
          </View>
        ) : (
          <Button title="Envoyer au backend" onPress={uploadVideo} />
        )}
      </View>

      {processedVideoUrl && (
        <View style={{ marginTop: 32 }}>
          <Text style={{ fontWeight: 'bold', marginBottom: 8 }}>
            Vidéo montée (avec sous-titres)
          </Text>
          <Video
            ref={videoRef}
            source={{ uri: processedVideoUrl }}
            style={{
              width: '100%',
              height: 220,
              backgroundColor: '#000',
            }}
            useNativeControls
            resizeMode="contain"
            onPlaybackStatusUpdate={handlePlaybackStatusUpdate}
          />

          {/* Sous-titre affiché en dessous de la vidéo */}
          <View style={{ marginTop: 12, minHeight: 40, justifyContent: 'center' }}>
            <Text
              style={{
                textAlign: 'center',
                fontSize: 16,
                fontWeight: '600',
                paddingHorizontal: 8,
              }}
            >
              {currentSubtitle}
            </Text>
          </View>

          {/* Optionnel : debug des segments */}
          {subtitles.length > 0 && (
            <View style={{ marginTop: 16 }}>
              <Text style={{ fontWeight: 'bold', marginBottom: 4 }}>
                Segments sous-titres (debug) :
              </Text>
              {subtitles.map((seg, i) => (
                <Text key={i} style={{ fontSize: 12 }}>
                  [{seg.start.toFixed(1)}s → {seg.end.toFixed(1)}s] {seg.text}
                </Text>
              ))}
            </View>
          )}
        </View>
      )}
    </ScrollView>
  );
}
