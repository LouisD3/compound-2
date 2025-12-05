import React, { useState, useRef } from 'react';
import { View, Text, Button, ActivityIndicator, Alert, ScrollView, Dimensions, TouchableOpacity, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as ImagePicker from 'expo-image-picker';
import { Video } from 'expo-av';

const SERVER_URL = 'http://192.168.68.54:3000'; // adapte si besoin

export default function App() {
  const [videoLocal, setVideoLocal] = useState(null);          // vidéo choisie sur le tel
  const [processedVideoUrl, setProcessedVideoUrl] = useState(null); // vidéo montée (backend)
  const [subtitles, setSubtitles] = useState([]);              // segments Whisper
  const [currentSubtitle, setCurrentSubtitle] = useState('');  // texte affiché
  const [uploading, setUploading] = useState(false);
  const [processedVideoHeight, setProcessedVideoHeight] = useState(220); // Hauteur dynamique de la vidéo traitée

  const videoRef = useRef(null);
  const screenWidth = Dimensions.get('window').width - 32; // Largeur disponible (moins padding)

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
      setProcessedVideoHeight(220); // Reset hauteur
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
      // Initialiser la hauteur avec les dimensions de la vidéo locale
      if (videoLocal && videoLocal.width && videoLocal.height) {
        const calculatedHeight = screenWidth * (videoLocal.height / videoLocal.width);
        setProcessedVideoHeight(calculatedHeight);
      } else {
        setProcessedVideoHeight(220); // Fallback si pas de dimensions
      }
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
    <>
      <StatusBar style="light" backgroundColor="#121212" />
      <ScrollView
        contentContainerStyle={styles.container}
      >
        <Text style={styles.title}>
          Test vidéo + sous-titres
        </Text>

      <TouchableOpacity style={styles.button} onPress={pickVideo}>
        <Text style={styles.buttonText}>Choisir une vidéo</Text>
      </TouchableOpacity>

      {videoLocal && !processedVideoUrl && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Prévisualisation locale</Text>
          <Video
            source={{ uri: videoLocal.uri }}
            style={[
              styles.video,
              {
                height: videoLocal.width && videoLocal.height 
                  ? (screenWidth * (videoLocal.height / videoLocal.width))
                  : 220,
              }
            ]}
            useNativeControls
            resizeMode="cover"
          />
        </View>
      )}

      <View style={styles.uploadSection}>
        {uploading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#fff" />
            <Text style={styles.loadingText}>Envoi + traitement en cours...</Text>
          </View>
        ) : (
          <TouchableOpacity style={styles.button} onPress={uploadVideo}>
            <Text style={styles.buttonText}>Envoyer au backend</Text>
          </TouchableOpacity>
        )}
      </View>

      {processedVideoUrl && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Vidéo montée (avec sous-titres)</Text>
          <Video
            ref={videoRef}
            source={{ uri: processedVideoUrl }}
            style={[
              styles.video,
              {
                height: processedVideoHeight,
              }
            ]}
            useNativeControls
            resizeMode="cover"
            onPlaybackStatusUpdate={handlePlaybackStatusUpdate}
            onLoad={(status) => {
              // Calculer la hauteur basée sur les dimensions de la vidéo
              if (status.isLoaded && status.naturalSize) {
                const { width: videoWidth, height: videoHeight } = status.naturalSize;
                if (videoWidth && videoHeight && videoWidth > 0 && videoHeight > 0) {
                  const calculatedHeight = screenWidth * (videoHeight / videoWidth);
                  console.log('Dimensions vidéo traitée:', { videoWidth, videoHeight, calculatedHeight });
                  setProcessedVideoHeight(calculatedHeight);
                }
              }
            }}
            onLoadStart={() => {
              // Utiliser les dimensions de la vidéo locale en attendant le chargement
              if (videoLocal && videoLocal.width && videoLocal.height) {
                const calculatedHeight = screenWidth * (videoLocal.height / videoLocal.width);
                setProcessedVideoHeight(calculatedHeight);
              }
            }}
          />

          {/* Optionnel : debug des segments */}
          {subtitles.length > 0 && (
            <View style={styles.debugSection}>
              <Text style={styles.debugTitle}>
                Segments sous-titres (debug) :
              </Text>
              {subtitles.map((seg, i) => (
                <Text key={i} style={styles.debugText}>
                  [{seg.start.toFixed(1)}s → {seg.end.toFixed(1)}s] {seg.text}
                </Text>
              ))}
            </View>
          )}
        </View>
      )}
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    paddingTop: 60,
    paddingHorizontal: 16,
    paddingBottom: 32,
    backgroundColor: '#121212', 
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 24,
    color: '#fff',
    textAlign: 'center',
  },
  button: {
    backgroundColor: '#fff',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    marginBottom: 16,
    alignItems: 'center',
    shadowColor: '#fff',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  buttonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '600',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginTop: 24,
    shadowColor: '#fff',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#000',
  },
  video: {
    width: '100%',
    backgroundColor: '#000',
    borderRadius: 12,
    overflow: 'hidden',
  },
  uploadSection: {
    marginTop: 24,
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  loadingText: {
    marginTop: 12,
    color: '#fff',
    fontSize: 16,
  },
  debugSection: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  debugTitle: {
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#000',
    fontSize: 14,
  },
  debugText: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
    lineHeight: 18,
  },
});
