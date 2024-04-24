import { initializeApp } from "firebase/app";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyAb4gneyoa5I2y98FGIZcLTBmaRrsabo2w",
  authDomain: "geo-camera-bc974.firebaseapp.com",
  projectId: "geo-camera-bc974",
  storageBucket: "geo-camera-bc974.appspot.com",
  messagingSenderId: "409926219096",
  appId: "1:409926219096:web:58a272eb566fb491bde12d",
  measurementId: "G-X86SE6QH47",
};

const app = initializeApp(firebaseConfig);
export const storage = getStorage(app);
