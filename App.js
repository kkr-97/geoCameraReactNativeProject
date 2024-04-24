import { useState, useEffect, useRef } from "react";
import { Camera } from "expo-camera";
import Button from "./src/components/Button";
import OpButton from "./src/components/OpButton";
import {
  StyleSheet,
  View,
  Text,
  Image,
  FlatList,
  useColorScheme,
} from "react-native";
import uuid from "react-native-uuid";
import { storage } from "./firebase";
import * as Location from "expo-location";
import {
  ref,
  uploadBytes,
  listAll,
  getMetadata,
  updateMetadata,
  getDownloadURL,
} from "firebase/storage";

export default function App() {
  const [hasCameraPermission, setCamPermission] = useState("");
  const [image, setImage] = useState(null);
  const [imageList, setImageList] = useState([]);
  const [camType, setCamType] = useState(Camera.Constants.Type.back);
  const [flash, setFlashState] = useState(Camera.Constants.FlashMode.off);
  const [galleryStatus, setGalleryStatus] = useState(false);
  const camRef = useRef(null);

  const colorScheme = useColorScheme();
  const isDarkMode = colorScheme === "dark";

  useEffect(() => {
    (async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setCamPermission(status === "granted");
    })();
    fetchUploadedImages();
  }, []);

  const fetchUploadedImages = async () => {
    try {
      const imagesRef = ref(storage, "files");
      const imageSnapshot = await listAll(imagesRef);
      const images = [];
      await Promise.all(
        imageSnapshot.items.map(async (itemRef) => {
          const url = await getDownloadURL(itemRef);
          const metadata = await getMetadata(itemRef);
          const locationDetails = metadata.customMetadata;
          if (
            locationDetails?.name &&
            locationDetails?.region &&
            locationDetails?.country
          ) {
            const locDetails = metadata.customMetadata;
            const image = { url, ...locDetails };
            images.push(image);
          } else {
            console.error(
              "Location details are missing or incomplete:",
              locationDetails
            );
          }
        })
      );
      setImageList(images);
    } catch (error) {
      console.error("Error fetching uploaded images:", error);
    }
  };

  const takePicture = async () => {
    if (camRef) {
      try {
        const data = await camRef.current.takePictureAsync();
        setImage(data.uri);
      } catch (error) {
        console.log(error);
      }
    }
  };

  const uploadImage = async () => {
    if (!image) {
      console.error("No image captured.");
      return;
    }
    if (camRef) {
      try {
        let location = null;
        let locationDetails = {};
        try {
          const { status } = await Location.requestForegroundPermissionsAsync();
          if (status !== "granted") {
            console.error("Permission to access location was denied");
            return;
          }

          const currentLocation = await Location.getCurrentPositionAsync({});
          location = currentLocation.coords;
          const response = await fetch(
            `https://api.weatherapi.com/v1/current.json?key=b794cae794364b1fb1f15235241904&q=${location.latitude},${location.longitude}&aqi=yes`
          );
          const data = await response.json();
          const { name, region, country } = data.location;
          locationDetails = {
            name,
            region,
            country,
            latitude: location.latitude,
            longitude: location.longitude,
          };
        } catch (error) {
          console.error("Error fetching location:", error);
          return;
        }

        const metadata = {
          customMetadata: locationDetails,
        };

        const storageRef = ref(
          storage,
          `files/geoCamera-${uuid.v4()}` + ".jpg"
        );
        const response = await fetch(image);
        const blob = await response.blob();
        const snapshot = await uploadBytes(storageRef, blob);

        await updateMetadata(snapshot.ref, metadata);

        const url = await getDownloadURL(snapshot.ref);
        console.log(url);
        setImageList([...imageList, { url, metadata }]);
      } catch (error) {
        console.error("Error uploading image:", error);
      }
      setImage(null);
    }
  };

  const onChangeCamType = () => {
    setCamType(
      camType === Camera.Constants.Type.front
        ? Camera.Constants.Type.back
        : Camera.Constants.Type.front
    );
  };

  const onChangeFlash = () => {
    setFlashState(
      flash === Camera.Constants.FlashMode.off
        ? Camera.Constants.FlashMode.on
        : Camera.Constants.FlashMode.off
    );
  };

  const viewGallery = () => {
    setGalleryStatus((prevState) => !prevState);
  };

  const renderGalleryItem = ({ item }) => (
    <View style={styles.imageContainer}>
      <Image source={{ uri: item.url }} style={styles.galleryImage} />
      <Text
        style={[styles.metadataText, { color: isDarkMode ? "#fff" : "#000" }]}
      >
        {`Location: ${item.name}, ${item.region}, ${item.country}`}
      </Text>
    </View>
  );

  if (hasCameraPermission === false) {
    return <Text>No Camera Permission</Text>;
  }

  if (!galleryStatus) {
    return (
      <View style={styles.container}>
        {!image ? (
          <Camera
            type={camType}
            flashMode={flash}
            ref={camRef}
            style={styles.camera}
          >
            <View style={styles.btnContainer}>
              <OpButton
                name=""
                icon="flash"
                onPress={onChangeFlash}
                isActive={flash === Camera.Constants.FlashMode.on}
              />
              <OpButton name="" icon="swap" onPress={onChangeCamType} />
            </View>
            <View style={styles.btnContainer}>
              <Button name="" icon="camera" onPress={takePicture} />
              <Button name="" icon="images" onPress={viewGallery} />
            </View>
          </Camera>
        ) : (
          <View style={styles.container}>
            <Image source={{ uri: image }} style={styles.camera} />
            <View style={styles.btnContainer}>
              <Button name="Retake" onPress={() => setImage(null)} />
              <Button name="Upload" onPress={uploadImage} />
            </View>
          </View>
        )}
      </View>
    );
  }
  return (
    <View style={styles.container}>
      <FlatList
        data={imageList}
        renderItem={renderGalleryItem}
        keyExtractor={(item) => item.url}
        numColumns={2}
        contentContainerStyle={styles.galleryContainer}
      />
      <Button
        icon="camera"
        onPress={() => setGalleryStatus(false)}
        name="Capture Another Image"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  camera: {
    flex: 1,
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 32,
  },
  btnContainer: {
    flexDirection: "row",
    width: "100%",
    justifyContent: "space-between",
    paddingHorizontal: 32,
    marginBottom: 12,
    marginTop: 12,
  },
  imageContainer: {
    width: "46%",
    aspectRatio: 1,
    borderRadius: 10,
    marginBottom: 54,
    marginLeft: 6,
    marginRight: 6,
  },
  galleryImage: {
    width: "100%",
    height: "100%",
  },
  metadataText: {
    fontSize: 14,
    fontWeight: "bold",
    textAlign: "center",
  },
  galleryContainer: {
    paddingVertical: 32,
    backgroundColor: "#000",
  },
});
