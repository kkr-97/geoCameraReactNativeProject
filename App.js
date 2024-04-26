import { useState, useEffect, useRef } from "react";
import { Camera } from "expo-camera";
import Button from "./src/components/Button";
import OpButton from "./src/components/OpButton";
import Icon from "react-native-vector-icons/Entypo";
import {
  StyleSheet,
  View,
  Text,
  Image,
  FlatList,
  TouchableOpacity,
  Linking,
  Modal,
  Button as RNButton,
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
  const [cols, setViewCols] = useState(2);
  const [modalImage, setModalImageUrl] = useState("");

  useEffect(() => {
    (async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setCamPermission(status === "granted");
    })();
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
        let metadata = {};
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
          metadata = {
            customMetadata: locationDetails,
          };
        } catch (error) {
          console.error("Error fetching location:", error);
          return;
        }

        const storageRef = ref(
          storage,
          `files/geoCamera-${uuid.v4()}` + ".jpg"
        );
        const response = await fetch(image);
        const blob = await response.blob();
        const snapshot = await uploadBytes(storageRef, blob);

        await updateMetadata(snapshot.ref, metadata);

        const url = await getDownloadURL(snapshot.ref);
        setImage(null);
      } catch (error) {
        console.error("Error uploading image:", error);
      }
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
    fetchUploadedImages();
    setGalleryStatus((prevState) => !prevState);
  };

  const openMaps = (latitude, longitude) => {
    const url = `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;
    Linking.openURL(url);
  };

  const toggleCols = () => {
    setViewCols(cols === 2 ? 1 : 2);
  };

  if (hasCameraPermission === false) {
    return <Text>No Camera Permission</Text>;
  }

  const renderGalleryItem = ({ item }) => (
    <TouchableOpacity
      style={cols === 1 ? styles.listItemContainer : styles.gridItemContainer}
      onPress={() => setModalImageUrl(item.url)}
    >
      <Image
        source={{ uri: item.url }}
        style={cols === 1 ? styles.listImage : styles.gridImage}
      />
      <View style={styles.metaDataContainer}>
        <Text style={styles.metadataText}>
          {`Location: ${item.name}, ${item.region}, ${item.country}`}
        </Text>
        <Text style={styles.metadataText}>
          {`Latitude: ${item.latitude}, Longitude: ${item.longitude}`}
        </Text>
        <TouchableOpacity
          style={styles.mapsButton}
          onPress={() => openMaps(item.latitude, item.longitude)}
        >
          <Text style={styles.buttonText}>
            View in Maps <Icon name="map" />
          </Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  const galleryView = () => {
    if (modalImage === "") {
      return (
        <View style={styles.container}>
          {cols === 1 ? (
            <Button icon="grid" name="Grid View" onPress={toggleCols} />
          ) : (
            <Button icon="list" name="List View" onPress={toggleCols} />
          )}

          <FlatList
            data={imageList}
            renderItem={renderGalleryItem}
            numColumns={cols}
            keyExtractor={(item) => item.url}
            key={cols}
            style={styles.galleryContainer}
          />
          <Button
            icon="camera"
            onPress={() => setGalleryStatus(false)}
            name="Capture Another Image"
          />
        </View>
      );
    }
    return (
      <View style={styles.container}>
        <Modal
          animationType="slide"
          transparent={true}
          visible={true}
          onRequestClose={() => setModalImageUrl("")}
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalContent}>
              <Image
                source={{ uri: modalImage }}
                style={styles.modalImage}
                resizeMode="contain"
              />
              <RNButton title="Close" onPress={() => setModalImageUrl("")} />
            </View>
          </View>
        </Modal>
      </View>
    );
  };

  if (!galleryStatus) {
    return (
      <View style={styles.camContainer}>
        {!image ? (
          <Camera
            type={camType}
            flashMode={flash}
            ref={camRef}
            style={styles.camera}
            ratio="16:9"
          >
            <View style={styles.btnContainer}>
              <OpButton
                name=""
                icon="flash"
                onPress={onChangeFlash}
                isActive={flash === Camera.Constants.FlashMode.on}
              />
            </View>
            <View style={styles.btnContainer}>
              <OpButton name="" icon="swap" onPress={onChangeCamType} />
              <Button name="" icon="camera" onPress={takePicture} />
              <OpButton name="" icon="images" onPress={viewGallery} />
            </View>
          </Camera>
        ) : (
          <View style={styles.container}>
            <Image source={{ uri: image }} style={styles.camera} />
            <View style={styles.btnContainer}>
              <Button
                name="Retake"
                icon="retweet"
                onPress={() => setImage(null)}
              />
              <Button name="Upload" icon="upload" onPress={uploadImage} />
            </View>
          </View>
        )}
      </View>
    );
  }
  return galleryView();
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    marginTop: 32,
  },
  camContainer: {
    flex: 1,
    marginVertical: 32,
  },
  metaDataContainer: {
    flex: 1,
    flexDirection: "column",
    alignItems: "center",
    padding: 10,
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
  listItemContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 10,
    marginBottom: 20,
    padding: 10,
    flex: 1,
    backgroundColor: "#333333",
  },
  gridItemContainer: {
    flex: 1,
    alignItems: "center",
    margin: 6,
    marginBottom: 22,
  },
  listImage: {
    width: "50%",
    height: 240,
    borderRadius: 10,
  },
  gridImage: {
    width: "100%",
    height: 240,
    borderRadius: 10,
  },
  metadataText: {
    fontSize: 14,
    fontWeight: "bold",
    textAlign: "center",
    color: "#fff",
    marginLeft: 12,
    marginBottom: 12,
    flex: 1,
  },
  galleryContainer: {
    flex: 1,
    paddingVertical: 10,
    backgroundColor: "#000",
  },
  mapsButton: {
    backgroundColor: "#ADD8E6",
    padding: 10,
    borderRadius: 5,
  },
  modalContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 20,
    alignItems: "center",
    backgroundColor: "#333",
  },
  modalImage: {
    flex: 1,
    width: 330,
    height: "100%",
    borderRadius: 10,
  },
});
