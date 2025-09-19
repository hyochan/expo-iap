import React from 'react';
import {StyleSheet, Text, View, ViewStyle, TextStyle} from 'react-native';
import type {Purchase} from '../../../src';
import {buildPurchaseRows} from '../utils/buildPurchaseRows';

type PurchaseDetailsProps = {
  purchase: Purchase;
  containerStyle?: ViewStyle;
  rowStyle?: ViewStyle;
  labelStyle?: TextStyle;
  valueStyle?: TextStyle;
};

const PurchaseDetails: React.FC<PurchaseDetailsProps> = ({
  purchase,
  containerStyle,
  rowStyle,
  labelStyle,
  valueStyle,
}) => {
  const rows = React.useMemo(() => buildPurchaseRows(purchase), [purchase]);

  if (rows.length === 0) {
    return null;
  }

  return (
    <View style={[styles.container, containerStyle]}>
      {rows.map((row) => (
        <View key={`${row.label}-${row.value}`} style={[styles.row, rowStyle]}>
          <Text style={[styles.label, labelStyle]}>{row.label}</Text>
          <Text style={[styles.value, valueStyle]}>{row.value}</Text>
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: 8,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  label: {
    flexShrink: 0,
    fontWeight: '600',
    color: '#333',
  },
  value: {
    flex: 1,
    color: '#555',
    textAlign: 'right',
  },
});

export default PurchaseDetails;
