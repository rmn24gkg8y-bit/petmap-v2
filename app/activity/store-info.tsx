import { router, Stack } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

function BackArrowIcon() {
  return (
    <Svg width={8} height={16} viewBox="0 0 11 19" fill="none">
      <Path
        d="M9.5 17.5L1.5 9.5L9.5 1.5"
        stroke="#FFFFFF"
        strokeWidth={3}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export default function ServiceStoreInfoScreen() {
  const insets = useSafeAreaInsets();
  const heroHeight = insets.top + 349;

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />

      <ScrollView
        style={styles.scrollView}
        alwaysBounceVertical
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 108 }]}>
        <View style={[styles.hero, { height: heroHeight }]}>
          <SafeAreaView edges={['top']} style={styles.safeTopRow}>
            <Pressable onPress={() => router.back()} style={styles.backButton}>
              <BackArrowIcon />
            </Pressable>
            <Text style={styles.pageTitle}>活动详情</Text>
            <View style={styles.backButtonPlaceholder} />
          </SafeAreaView>

          <View style={styles.titleSection}>
            <Text style={styles.title}>徐汇滨江爱宠节</Text>
            <Text style={styles.subtitle}>
              徐汇滨江在1月12日-1月29日举办爱宠节，众多宠物品牌将来到滨江，一起狂欢！
            </Text>
          </View>

          <View style={styles.headerPic} />
        </View>

        <View style={styles.contentSheet}>
          <View style={styles.contentBody} />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ED8422',
  },
  scrollView: {
    flex: 1,
    backgroundColor: '#ED8422',
  },
  scrollContent: {
    flexGrow: 1,
  },
  hero: {
    position: 'relative',
    backgroundColor: '#ED8422',
  },
  safeTopRow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingTop: 6,
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 6,
  },
  backButton: {
    width: 30,
    height: 30,
    padding: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backButtonPlaceholder: {
    width: 30,
    height: 30,
  },
  pageTitle: {
    flex: 1,
    textAlign: 'center',
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 20,
  },
  titleSection: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 192,
    width: 335,
    maxWidth: '100%',
    gap: 2,
    zIndex: 3,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 20,
    lineHeight: 28,
    fontWeight: '700',
  },
  subtitle: {
    color: '#FFFFFF',
    fontSize: 14,
    lineHeight: 24,
    fontWeight: '400',
  },
  headerPic: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 10,
    height: 172,
    borderRadius: 20,
    backgroundColor: '#D9D9D9',
    zIndex: 2,
  },
  contentSheet: {
    flex: 1,
    minHeight: 520,
    backgroundColor: '#FFFEFF',
    paddingTop: 14,
  },
  contentBody: {
    flex: 1,
  },
});
