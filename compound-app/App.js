import { useState, useEffect } from "react";
import {
  View,
  Text,
  Button,
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Platform,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { Video, Audio } from "expo-av";
import { TouchableOpacity } from "react-native";

export default function App() {
  const [video, setVideo] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [serverResponse, setServerResponse] = useState(null);

  useEffect(() => {
    if (Platform.OS === "ios") {
      Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
      })
        .then(() => console.log("Audio mode set ✅"))
        .catch((e) => console.log("Erreur setAudioModeAsync", e));
    }
  }, []);

  async function pickVideo() {
    // Demander la permission d'accéder à la galerie
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      alert("Permission refusée pour accéder à la galerie");
      return;
    }

    // Ouvrir la galerie en mode vidéo
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Videos,
      quality: 1,
    });

    if (!result.canceled) {
      // Sur la nouvelle API, les fichiers sont dans result.assets
      const selected = result.assets[0];
      setVideo(selected);
      setServerResponse(null);
    }
  }

  async function uploadVideo() {
    if (!video) {
      alert("Choisis une vidéo avant");
      return;
    }

    try {
      setUploading(true);
      setServerResponse(null);

      const formData = new FormData();
      formData.append("file", {
        uri: video.uri,
        name: "video.mp4", // nom arbitraire
        type: "video/mp4", // tu pourras adapter ensuite
      });

      const response = await fetch("http://192.168.1.245:3000/upload", {
        method: "POST",
        body: formData,
        // ne PAS mettre de Content-Type ici, fetch le gère tout seul
      });

      const json = await response.json();
      setServerResponse(json);
    } catch (err) {
      console.error(err);
      alert("Erreur lors de l'upload");
    } finally {
      setUploading(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Compound</Text>
      <TouchableOpacity style={styles.button} onPress={pickVideo}>
        <Text style={styles.buttonText}>Choisir une vidéo</Text>
      </TouchableOpacity>

      {video && (
        <View style={{ marginTop: 20 }}>
          <Text>Vidéo sélectionnée :</Text>
          <Text numberOfLines={1}>URI : {video.uri}</Text>
          {video.duration && (
            <Text>Durée : {Math.round(video.duration / 1000)} sec</Text>
          )}

          <View style={{ marginTop: 16 }}>
            {uploading ? (
              <ActivityIndicator size="small" />
            ) : (
              <Button
                title="Envoyer pour montage + sous-titres"
                onPress={uploadVideo}
              />
            )}
          </View>
        </View>
      )}

      {serverResponse && (
        <View style={{ marginTop: 24 }}>
          <Text style={{ fontWeight: "bold", marginBottom: 8 }}>
            Résultat du traitement :
          </Text>

          <Text>{serverResponse.message}</Text>

          {serverResponse?.processedVideoUrl && (
            <View style={{ marginTop: 16 }}>
              <Text>Vidéo montée :</Text>
              <Video
                source={{ uri: serverResponse.processedVideoUrl }}
                style={{
                  width: "100%",
                  height: 220,
                  backgroundColor: "#000",
                  marginTop: 8,
                }}
                useNativeControls
                resizeMode="contain"
                isMuted={false}
              />
            </View>
          )}
          {serverResponse?.transcription && (
            <View style={{ marginTop: 16 }}>
              <Text style={{ fontWeight: "bold", marginBottom: 4 }}>
                Transcription :
              </Text>
              <Text style={{ fontSize: 14 }}>
                {serverResponse?.transcription}
              </Text>
            </View>
          )}
          {serverResponse?.segments && serverResponse.segments.length > 0 && (
            <View style={{ marginTop: 16 }}>
              <Text style={{ fontWeight: "bold" }}>Segments :</Text>
              {serverResponse.segments.map((seg, i) => (
                <Text key={i}>
                  [{seg.start.toFixed(2)}s - {seg.end.toFixed(2)}s] {seg.text}
                </Text>
              ))}
            </View>
          )}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    display: "flex",
    padding: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
    height: "100%",
    width: "100%",
  },
  buttonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
    textAlign: "center",
  },
  button: {
    marginTop: 20,
    padding: 10,
    backgroundColor: "#007AFF",
    borderRadius: 5,
    width: "50%",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 20,
  },
});
