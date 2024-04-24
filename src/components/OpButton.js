import * as React from "react";
import Icon from "react-native-vector-icons/Entypo";
import { Text, TouchableOpacity, StyleSheet } from "react-native";

export default function OpButton({ name, onPress, icon, isActive }) {
  return (
    <TouchableOpacity style={styles.button} onPress={onPress}>
      <Icon name={icon} size={30} color={isActive ? "#ADD8E6" : "#f1f1f1"} />
      <Text style={styles.text}>{name}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 18,
    paddingHorizontal: 20,
    borderRadius: 50,
    alignSelf: "center",
    backgroundColor: "#f1f1f130",
  },
  text: {
    fontSize: 16,
  },
});
