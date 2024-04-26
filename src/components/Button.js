import * as React from "react";
import Icon from "react-native-vector-icons/Entypo";
import { Text, TouchableOpacity, StyleSheet } from "react-native";

export default function Button({ name, onPress, icon, color }) {
  return (
    <TouchableOpacity style={styles.button} onPress={onPress}>
      <Icon name={icon} size={30} color={color} />
      {name !== "" ? <Text style={styles.text}>{name}</Text> : null}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 50,
    alignSelf: "center",
    backgroundColor: "#f0f0f0",
    marginVertical: 8,
  },
  text: {
    fontSize: 16,
    marginLeft: 10,
  },
});
