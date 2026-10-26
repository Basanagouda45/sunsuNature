import React from 'react';
import { View, StyleSheet, Image } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { colors, font } from '@/src/theme';

// Local asset
const logo = require('../../assets/images/logo.png');

export function SunLogo({
  size = 50,
  color = colors.brand,
  dark = false,
}: {
  size?: number;
  color?: string;
  dark?: boolean;
}) {
  const markSize = size + 8; // Default: 30px

  return (
    <View style={styles.row}>
    
      {/* Sunsu Brand Logo */}
      <Image
        source={logo}
        style={styles.logoImage}
        resizeMode="contain"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  mark: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoImage: {
    // Keep height close to navbar/mark height so it doesn't stretch the container
    height: 36,
    // Set width wide enough for the landscape logo to fill the space
    width: 120,
    marginLeft:-10,
    marginTop: -5
  },
});