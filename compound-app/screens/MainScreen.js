import React, { useState, useRef } from "react";
import {
  View,
  Text,
  Button,
  ActivityIndicator,
  Alert,
  ScrollView,
  Dimensions,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import * as ImagePicker from "expo-image-picker";
import { Video } from "expo-av";

const SERVER_URL = "http://192.168.68.54:3000"; // adapte si besoin

export default function App() {
  const [videoLocal, setVideoLocal] = useState(null); // vidéo choisie sur le tel
  const [processedVideoUrl, setProcessedVideoUrl] = useState(null); // vidéo montée (backend)
  const [subtitles, setSubtitles] = useState([]); // segments Whisper
  const [currentSubtitle, setCurrentSubtitle] = useState(""); // texte affiché
  const [uploading, setUploading] = useState(false);
  const [processedVideoHeight, setProcessedVideoHeight] = useState(220); // Hauteur dynamique de la vidéo traitée

  const videoRef = useRef(null);
  const screenWidth = Dimensions.get("window").width - 32; // Largeur disponible (moins padding)

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
      setCurrentSubtitle("");
      setProcessedVideoHeight(220); // Reset hauteur
    }
  };

  const uploadVideo = async () => {
    if (!videoLocal) {
      Alert.alert("No Video", "Please select a video first.");
      return;
    }

    try {
      setUploading(true);

      const formData = new FormData();
      formData.append("file", {
        uri: videoLocal.uri,
        name: "video.mp4",
        type: "video/mp4",
      });

      const res = await fetch(`${SERVER_URL}/upload`, {
        method: "POST",
        body: formData,
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      if (!res.ok) {
        throw new Error("Erreur serveur");
      }

      const json = await res.json();
      console.log("Réponse serveur :", json);

      setUploading(false);
      setProcessedVideoUrl(json.processedVideoUrl);
      setSubtitles(json.subtitles || []);
      setCurrentSubtitle("");
      // Initialiser la hauteur avec les dimensions de la vidéo locale
      if (videoLocal && videoLocal.width && videoLocal.height) {
        const calculatedHeight =
          screenWidth * (videoLocal.height / videoLocal.width);
        setProcessedVideoHeight(calculatedHeight);
      } else {
        setProcessedVideoHeight(220); // Fallback si pas de dimensions
      }
    } catch (e) {
      console.error(e);
      setUploading(false);
      Alert.alert("Error", "Unable to process the video. Please try again.");
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
      if (currentSubtitle !== "") {
        setCurrentSubtitle("");
      }
    }
  };

  return (
    <>
      <StatusBar style="light" backgroundColor="#121212" />
      <View style={styles.header}>
        <Text style={styles.headerTitle}>compound</Text>
      </View>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Create your content</Text>
        <Text style={styles.subtitle}>
          Import a raw clip and let AI handle the subtitles and silence cuts.
        </Text>

        <TouchableOpacity style={styles.button} onPress={pickVideo}>
          <Text style={styles.buttonText}>Select Video</Text>
        </TouchableOpacity>

         {videoLocal && !processedVideoUrl && (
           <View style={styles.card}>
             <Text style={styles.cardTitle}>Preview</Text>
             <Video
               source={{ uri: videoLocal.uri }}
               style={[
                 styles.video,
                 {
                   height:
                     videoLocal.width && videoLocal.height
                       ? (screenWidth * (videoLocal.height / videoLocal.width)) * 0.6
                       : 150,
                 },
               ]}
               useNativeControls
               resizeMode="cover"
             />
           </View>
         )}

        {videoLocal && (
          <View style={styles.uploadSection}>
            {uploading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#fff" />
                <Text style={styles.loadingText}>Processing your video...</Text>
              </View>
            ) : (
              <TouchableOpacity style={styles.button} onPress={uploadVideo}>
                <Text style={styles.buttonText}>Process Video</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {processedVideoUrl && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Your Video with Subtitles</Text>
            <Video
              ref={videoRef}
              source={{ uri: processedVideoUrl }}
              style={[
                styles.video,
                {
                  height: processedVideoHeight,
                },
              ]}
              useNativeControls
              resizeMode="cover"
              onPlaybackStatusUpdate={handlePlaybackStatusUpdate}
              onLoad={(status) => {
                // Calculer la hauteur basée sur les dimensions de la vidéo
                if (status.isLoaded && status.naturalSize) {
                  const { width: videoWidth, height: videoHeight } =
                    status.naturalSize;
                  if (
                    videoWidth &&
                    videoHeight &&
                    videoWidth > 0 &&
                    videoHeight > 0
                  ) {
                    const calculatedHeight =
                      screenWidth * (videoHeight / videoWidth);
                    console.log("Dimensions vidéo traitée:", {
                      videoWidth,
                      videoHeight,
                      calculatedHeight,
                    });
                    setProcessedVideoHeight(calculatedHeight);
                  }
                }
              }}
              onLoadStart={() => {
                // Utiliser les dimensions de la vidéo locale en attendant le chargement
                if (videoLocal && videoLocal.width && videoLocal.height) {
                  const calculatedHeight =
                    screenWidth * (videoLocal.height / videoLocal.width);
                  setProcessedVideoHeight(calculatedHeight);
                }
              }}
            />

            {currentSubtitle && (
              <View style={styles.subtitleOverlay}>
                <Text style={styles.subtitleText}>{currentSubtitle}</Text>
              </View>
            )}
          </View>
        )}
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 24,
    paddingTop: 50,
    paddingBottom: 16,
    backgroundColor: "#000",
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#fff",
  },
  container: {
    flexGrow: 1,
    paddingTop: 20,
    paddingHorizontal: 16,
    paddingBottom: 32,
    backgroundColor: "#000",
  },
  title: {
    fontSize: 32,
    fontWeight: "bold",
    marginBottom: 8,
    color: "#fff",
    textAlign: "center",
  },
  subtitle: {
    fontSize: 16,
    color: "#999",
    marginBottom: 32,
    textAlign: "center",
    paddingHorizontal: 24,
  },
  button: {
    backgroundColor: "#2a2a2a",
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    marginBottom: 16,
    alignItems: "center",
    borderWidth: 0,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  card: {
    backgroundColor: "#1a1a1a",
    borderRadius: 16,
    padding: 16,
    marginTop: 24,
    borderWidth: 0,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 12,
    color: "#fff",
  },
  video: {
    width: "100%",
    backgroundColor: "#000",
    borderRadius: 12,
    overflow: "hidden",
  },
  uploadSection: {
    marginTop: 24,
  },
  loadingContainer: {
    alignItems: "center",
    paddingVertical: 20,
  },
  loadingText: {
    marginTop: 12,
    color: "#fff",
    fontSize: 16,
  },
  subtitleOverlay: {
    marginTop: 16,
    padding: 16,
    backgroundColor: "rgba(0, 0, 0, 0.8)",
    borderRadius: 12,
    alignItems: "center",
  },
  subtitleText: {
    fontSize: 18,
    color: "#fff",
    fontWeight: "600",
    textAlign: "center",
    lineHeight: 24,
  },
});
