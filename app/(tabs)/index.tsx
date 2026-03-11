import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import * as Location from 'expo-location';
import MapView, { Marker, type Region } from 'react-native-maps';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { DISTRICT_OPTIONS, TAG_OPTIONS } from '@/constants/spotFormOptions';
import { usePetMapStore } from '@/store/petmap-store';

const INITIAL_REGION: Region = {
  latitude: 31.2215,
  longitude: 121.4389,
  latitudeDelta: 0.08,
  longitudeDelta: 0.08,
};

export default function TabOneScreen() {
  const insets = useSafeAreaInsets();
  const mapRef = useRef<MapView | null>(null);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [editingSpotId, setEditingSpotId] = useState<string | null>(null);
  const [isCreateModalVisible, setIsCreateModalVisible] = useState(false);
  const [pendingCoords, setPendingCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [formError, setFormError] = useState('');
  const [formValues, setFormValues] = useState({
    name: '',
    district: '',
    addressHint: '',
    description: '',
    tags: [] as string[],
  });
  const {
    totalSpots,
    favoriteCount,
    spots,
    selectedSpot,
    addSpot,
    updateSpot,
    removeSpot,
    submitSpotForReview,
    setSelectedSpot,
    setUserLoc,
    clearSelectedSpot,
    toggleFavorite,
    isFavorite,
  } = usePetMapStore();

  useEffect(() => {
    let isMounted = true;

    async function requestUserLocation() {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();

        if (status !== 'granted' || !isMounted) {
          return;
        }

        const position = await Location.getCurrentPositionAsync({});

        if (!isMounted) {
          return;
        }

        setUserLoc({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
      } catch {
        // Keep the map usable even if location is unavailable.
      }
    }

    requestUserLocation();

    return () => {
      isMounted = false;
    };
  }, [setUserLoc]);

  useEffect(() => {
    if (!selectedSpot || !mapRef.current) {
      return;
    }

    mapRef.current.animateToRegion(
      {
        latitude: selectedSpot.lat,
        longitude: selectedSpot.lng,
        latitudeDelta: 0.03,
        longitudeDelta: 0.03,
      },
      350
    );
  }, [selectedSpot]);

  function handleLongPress({ nativeEvent }: { nativeEvent: { coordinate: { latitude: number; longitude: number } } }) {
    setModalMode('create');
    setEditingSpotId(null);
    setPendingCoords({
      lat: nativeEvent.coordinate.latitude,
      lng: nativeEvent.coordinate.longitude,
    });
    setFormValues({
      name: '',
      district: '',
      addressHint: '',
      description: '',
      tags: [],
    });
    setFormError('');
    setIsCreateModalVisible(true);
  }

  function closeCreateModal() {
    setIsCreateModalVisible(false);
    setPendingCoords(null);
    setEditingSpotId(null);
    setModalMode('create');
    setFormError('');
  }

  function updateFormValue(
    field: Exclude<keyof typeof formValues, 'tags'>,
    value: string
  ) {
    setFormError('');
    setFormValues((current) => ({ ...current, [field]: value }));
  }

  function toggleTag(tag: string) {
    setFormError('');
    setFormValues((current) => ({
      ...current,
      tags: current.tags.includes(tag)
        ? current.tags.filter((item) => item !== tag)
        : [...current.tags, tag],
    }));
  }

  function handleSubmitSpot() {
    if (!pendingCoords) {
      return;
    }

    const name = formValues.name.trim();
    const district = formValues.district.trim();
    const addressHint = formValues.addressHint.trim();
    const description = formValues.description.trim();
    const tags = formValues.tags;

    if (!name) {
      setFormError('请填写地点名称');
      return;
    }

    if (!district) {
      setFormError('请补充所属区');
      return;
    }

    if (!addressHint) {
      setFormError('请补充位置提示');
      return;
    }

    if (modalMode === 'edit') {
      if (!editingSpotId || !selectedSpot || selectedSpot.source !== 'user') {
        return;
      }

      const updatedSpot = {
        ...selectedSpot,
        id: editingSpotId,
        name,
        district,
        addressHint,
        lat: pendingCoords.lat,
        lng: pendingCoords.lng,
        tags,
        description,
      };

      updateSpot(updatedSpot);
      setSelectedSpot(updatedSpot.id);
      Alert.alert('保存成功', '地点信息已更新');
    } else {
      const newSpot = {
        id: `user-spot-${Date.now()}`,
        name,
        source: 'user' as const,
        submissionStatus: 'local' as const,
        district,
        addressHint,
        lat: pendingCoords.lat,
        lng: pendingCoords.lng,
        tags,
        description,
        votes: 0,
      };

      addSpot(newSpot);
      setSelectedSpot(newSpot.id);
      Alert.alert('新增成功', '新地点已保存在本机');
    }

    closeCreateModal();
  }

  function handleEditSpot() {
    if (!selectedSpot || selectedSpot.source !== 'user') {
      return;
    }

    setModalMode('edit');
    setEditingSpotId(selectedSpot.id);
    setPendingCoords({
      lat: selectedSpot.lat,
      lng: selectedSpot.lng,
    });
    setFormValues({
      name: selectedSpot.name,
      district: selectedSpot.district,
      addressHint: selectedSpot.addressHint,
      description: selectedSpot.description,
      tags: selectedSpot.tags,
    });
    setFormError('');
    setIsCreateModalVisible(true);
  }

  function handleDeleteSpot() {
    if (!selectedSpot || selectedSpot.source !== 'user') {
      return;
    }

    Alert.alert('确认删除地点？', '删除后将无法恢复', [
      {
        text: '取消',
        style: 'cancel',
      },
      {
        text: '删除',
        style: 'destructive',
        onPress: () => removeSpot(selectedSpot.id),
      },
    ]);
  }

  function handleSubmitForReview() {
    if (
      !selectedSpot ||
      selectedSpot.source !== 'user' ||
      selectedSpot.submissionStatus === 'pending_review'
    ) {
      return;
    }

    submitSpotForReview(selectedSpot.id);
    Alert.alert('提交成功', '该地点已进入待审核状态');
  }

  return (
    <View style={styles.container}>
      <View style={styles.mapSection}>
        <MapView
          ref={mapRef}
          style={styles.map}
          initialRegion={INITIAL_REGION}
          onLongPress={handleLongPress}
          showsUserLocation>
          {spots.map((spot) => {
            const isSelected = selectedSpot?.id === spot.id;

            return (
              <Marker
                key={spot.id}
                coordinate={{ latitude: spot.lat, longitude: spot.lng }}
                tracksViewChanges={false}
                onPress={() => setSelectedSpot(spot.id)}>
                <View style={styles.markerContainer}>
                  <View
                    style={[
                      styles.markerPin,
                      isSelected ? styles.markerPinSelected : styles.markerPinDefault,
                    ]}>
                    <View
                      style={[
                        styles.markerCenter,
                        isSelected ? styles.markerCenterSelected : styles.markerCenterDefault,
                      ]}
                    />
                  </View>
                  <View
                    style={[
                      styles.markerStem,
                      isSelected ? styles.markerStemSelected : styles.markerStemDefault,
                    ]}
                  />
                </View>
              </Marker>
            );
          })}
        </MapView>
      </View>

      <ScrollView
        style={styles.panel}
        contentContainerStyle={[styles.panelContent, { paddingBottom: insets.bottom + 32 }]}
        showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>PetMap</Text>
          <Text style={styles.description}>地图页开发中</Text>
          <Text style={styles.count}>当前已有 {totalSpots} 个地点</Text>
          <Text style={styles.count}>当前已收藏 {favoriteCount} 个地点</Text>
        </View>

        {selectedSpot ? (
          <View style={styles.card}>
            <Text style={styles.cardLabel}>当前选中地点</Text>
            <Text style={styles.cardTitle}>{selectedSpot.name}</Text>
            <Text style={styles.sourceBadge}>
              {selectedSpot.source === 'user' ? '我添加的' : '系统收录'}
            </Text>
            {selectedSpot.source === 'user' ? (
              <Text style={styles.statusText}>
                状态：{selectedSpot.submissionStatus === 'pending_review' ? '待审核' : '仅本机保存'}
              </Text>
            ) : null}
            <Text style={styles.meta}>
              {selectedSpot.district} · {selectedSpot.addressHint}
            </Text>
            <Text style={styles.tags}>{selectedSpot.tags.join(' · ')}</Text>
            <Text style={styles.cardDescription}>{selectedSpot.description}</Text>
            <Text style={styles.votes}>{selectedSpot.votes} votes</Text>

            <View style={styles.actions}>
              <Pressable
                onPress={() => toggleFavorite(selectedSpot.id)}
                style={styles.primaryActionButton}>
                <Text style={styles.primaryActionText}>
                  {isFavorite(selectedSpot.id) ? '已收藏' : '收藏'}
                </Text>
              </Pressable>

              <Pressable onPress={clearSelectedSpot} style={styles.secondaryButton}>
                <Text style={styles.secondaryButtonText}>清空选择</Text>
              </Pressable>

              {selectedSpot.source === 'user' && selectedSpot.submissionStatus !== 'pending_review' ? (
                <Pressable
                  onPress={handleSubmitForReview}
                  style={styles.secondaryButton}>
                  <Text style={styles.secondaryButtonText}>提交审核</Text>
                </Pressable>
              ) : null}

              {selectedSpot.source === 'user' ? (
                <Pressable onPress={handleEditSpot} style={styles.secondaryButton}>
                  <Text style={styles.secondaryButtonText}>编辑地点</Text>
                </Pressable>
              ) : null}

              {selectedSpot.source === 'user' ? (
                <Pressable
                  onPress={handleDeleteSpot}
                  style={styles.dangerButton}>
                  <Text style={styles.dangerButtonText}>删除地点</Text>
                </Pressable>
              ) : null}
            </View>
          </View>
        ) : (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>当前没有选中地点</Text>
            <Text style={styles.emptyDescription}>请先去 Explore 选择一个地点</Text>

            <Pressable
              onPress={() => router.navigate('/(tabs)/explore')}
              style={styles.primaryButton}>
              <Text style={styles.primaryButtonText}>前往 Explore</Text>
            </Pressable>
          </View>
        )}
      </ScrollView>

      <Modal
        animationType="slide"
        transparent
        visible={isCreateModalVisible}
        onRequestClose={closeCreateModal}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>
              {modalMode === 'edit' ? '编辑地点' : '新增地点'}
            </Text>
            <Text style={styles.modalSubtitle}>
              {modalMode === 'edit'
                ? '修改当前地点信息，坐标将保持不变。'
                : '长按位置已记录，补充基础信息后即可保存。'}
            </Text>
            <Text style={styles.modalHelperText}>标签支持使用逗号分隔，当前仅保存在本机。</Text>

            <ScrollView
              style={styles.modalForm}
              contentContainerStyle={styles.modalFormContent}
              showsVerticalScrollIndicator={false}>
              <TextInput
                value={formValues.name}
                onChangeText={(value) => updateFormValue('name', value)}
                placeholder="地点名称"
                style={styles.input}
              />
              <TextInput
                value={formValues.addressHint}
                onChangeText={(value) => updateFormValue('addressHint', value)}
                placeholder="位置提示，例如近某地铁站"
                style={styles.input}
              />
              <View style={styles.optionSection}>
                <Text style={styles.optionLabel}>所属区</Text>
                <View style={styles.chipGroup}>
                  {DISTRICT_OPTIONS.map((district) => {
                    const isSelected = formValues.district === district;

                    return (
                      <Pressable
                        key={district}
                        onPress={() => updateFormValue('district', district)}
                        style={[
                          styles.optionChip,
                          isSelected ? styles.optionChipActive : styles.optionChipInactive,
                        ]}>
                        <Text
                          style={[
                            styles.optionChipText,
                            isSelected
                              ? styles.optionChipTextActive
                              : styles.optionChipTextInactive,
                          ]}>
                          {district}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
              <TextInput
                value={formValues.description}
                onChangeText={(value) => updateFormValue('description', value)}
                placeholder="地点描述（选填）"
                style={[styles.input, styles.textarea]}
                multiline
              />
              <View style={styles.optionSection}>
                <Text style={styles.optionLabel}>标签</Text>
                <View style={styles.chipGroup}>
                  {TAG_OPTIONS.map((tag) => {
                    const isSelected = formValues.tags.includes(tag);

                    return (
                      <Pressable
                        key={tag}
                        onPress={() => toggleTag(tag)}
                        style={[
                          styles.optionChip,
                          isSelected ? styles.optionChipActive : styles.optionChipInactive,
                        ]}>
                        <Text
                          style={[
                            styles.optionChipText,
                            isSelected
                              ? styles.optionChipTextActive
                              : styles.optionChipTextInactive,
                          ]}>
                          {tag}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              {formError ? <Text style={styles.formErrorText}>{formError}</Text> : null}

              {pendingCoords ? (
                <Text style={styles.coordsText}>
                  坐标：{pendingCoords.lat.toFixed(5)}, {pendingCoords.lng.toFixed(5)}
                </Text>
              ) : null}
            </ScrollView>

            <View style={styles.modalActions}>
              <Pressable onPress={closeCreateModal} style={styles.modalSecondaryButton}>
                <Text style={styles.modalSecondaryButtonText}>取消</Text>
              </Pressable>
              <Pressable onPress={handleSubmitSpot} style={styles.modalPrimaryButton}>
                <Text style={styles.modalPrimaryButtonText}>
                  {modalMode === 'edit' ? '保存修改' : '保存地点'}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  mapSection: {
    flex: 0.95,
    minHeight: 260,
  },
  map: {
    flex: 1,
  },
  markerContainer: {
    alignItems: 'center',
  },
  markerPin: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 999,
    borderWidth: 2,
  },
  markerPinDefault: {
    width: 20,
    height: 20,
    backgroundColor: '#FFFFFF',
    borderColor: '#111827',
  },
  markerPinSelected: {
    width: 28,
    height: 28,
    backgroundColor: '#DBEAFE',
    borderColor: '#2563EB',
  },
  markerCenter: {
    borderRadius: 999,
  },
  markerCenterDefault: {
    width: 8,
    height: 8,
    backgroundColor: '#111827',
  },
  markerCenterSelected: {
    width: 12,
    height: 12,
    backgroundColor: '#2563EB',
  },
  markerStem: {
    width: 3,
    borderRadius: 999,
    marginTop: -1,
  },
  markerStemDefault: {
    height: 10,
    backgroundColor: '#111827',
  },
  markerStemSelected: {
    height: 12,
    backgroundColor: '#2563EB',
  },
  panel: {
    flex: 1.05,
  },
  panelContent: {
    padding: 20,
  },
  header: {
    marginTop: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111827',
  },
  description: {
    marginTop: 12,
    fontSize: 16,
    color: '#6B7280',
  },
  count: {
    marginTop: 8,
    fontSize: 15,
    color: '#374151',
  },
  emptyCard: {
    marginTop: 24,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    padding: 20,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
  },
  emptyDescription: {
    marginTop: 10,
    fontSize: 15,
    lineHeight: 22,
    color: '#6B7280',
  },
  card: {
    marginTop: 24,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    padding: 20,
  },
  cardLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
  },
  cardTitle: {
    marginTop: 8,
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
  },
  meta: {
    marginTop: 8,
    fontSize: 14,
    color: '#6B7280',
  },
  statusText: {
    marginTop: 8,
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
  },
  sourceBadge: {
    alignSelf: 'flex-start',
    marginTop: 10,
    borderRadius: 999,
    backgroundColor: '#E5E7EB',
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
  },
  tags: {
    marginTop: 10,
    fontSize: 13,
    color: '#2563EB',
  },
  cardDescription: {
    marginTop: 12,
    fontSize: 15,
    lineHeight: 22,
    color: '#4B5563',
  },
  votes: {
    marginTop: 12,
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 16,
  },
  primaryButton: {
    alignSelf: 'flex-start',
    marginTop: 16,
    borderRadius: 10,
    backgroundColor: '#111827',
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  primaryButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  primaryActionButton: {
    alignSelf: 'flex-start',
    borderRadius: 10,
    backgroundColor: '#111827',
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  primaryActionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  secondaryButton: {
    alignSelf: 'flex-start',
    marginTop: 16,
    borderRadius: 10,
    backgroundColor: '#E5E7EB',
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  secondaryButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  dangerButton: {
    alignSelf: 'flex-start',
    marginTop: 16,
    borderRadius: 10,
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  dangerButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#B91C1C',
  },
  modalBackdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(17, 24, 39, 0.4)',
  },
  modalCard: {
    maxHeight: '78%',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 32,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111827',
  },
  modalSubtitle: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 20,
    color: '#6B7280',
  },
  modalHelperText: {
    marginTop: 8,
    fontSize: 13,
    lineHeight: 18,
    color: '#6B7280',
  },
  modalForm: {
    marginTop: 16,
  },
  modalFormContent: {
    gap: 12,
    paddingBottom: 8,
  },
  optionSection: {
    gap: 10,
  },
  optionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  chipGroup: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  optionChip: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  optionChipActive: {
    backgroundColor: '#111827',
  },
  optionChipInactive: {
    backgroundColor: '#F3F4F6',
  },
  optionChipText: {
    fontSize: 13,
    fontWeight: '600',
  },
  optionChipTextActive: {
    color: '#FFFFFF',
  },
  optionChipTextInactive: {
    color: '#111827',
  },
  input: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#F9FAFB',
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#111827',
  },
  textarea: {
    minHeight: 96,
    textAlignVertical: 'top',
  },
  coordsText: {
    fontSize: 13,
    color: '#6B7280',
  },
  formErrorText: {
    fontSize: 13,
    color: '#B91C1C',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  modalPrimaryButton: {
    flex: 1,
    borderRadius: 12,
    backgroundColor: '#111827',
    paddingVertical: 12,
    alignItems: 'center',
  },
  modalPrimaryButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  modalSecondaryButton: {
    flex: 1,
    borderRadius: 12,
    backgroundColor: '#E5E7EB',
    paddingVertical: 12,
    alignItems: 'center',
  },
  modalSecondaryButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
});
