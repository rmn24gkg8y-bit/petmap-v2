import { type ReactNode } from 'react';
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { theme } from '@/constants/theme';
import { TagChip } from '@/components/ui/TagChip';

type SpotCardProps = {
  title: string;
  address: string;
  photoUri?: string;
  badges?: ReactNode;
  tags?: string[];
  horizontalTags?: boolean;
  description?: string;
  descriptionLines?: number;
  footer?: ReactNode;
  onPress?: () => void;
  onPressTop?: () => void;
  onPressBottom?: () => void;
  style?: StyleProp<ViewStyle>;
};

export function SpotCard({
  title,
  address,
  photoUri,
  badges,
  tags = [],
  horizontalTags = false,
  description,
  descriptionLines = 2,
  footer,
  onPress,
  onPressTop,
  onPressBottom,
  style,
}: SpotCardProps) {
  const topContent = (
    <>
      <View style={styles.topRow}>
        {photoUri ? (
          <Image source={{ uri: photoUri }} style={styles.thumbnail} />
        ) : (
          <View style={styles.thumbnailPlaceholder}>
            <Text style={styles.thumbnailPlaceholderText}>暂无图片</Text>
          </View>
        )}
        <View style={styles.topMeta}>
          <Text style={styles.title}>{title}</Text>
          {badges ? <View style={styles.badgeRow}>{badges}</View> : null}
        </View>
      </View>
      <Text style={styles.address}>{address}</Text>
    </>
  );

  const tagsContent =
    tags.length > 0 ? (
      horizontalTags ? (
        <ScrollView
          horizontal
          nestedScrollEnabled
          directionalLockEnabled
          showsHorizontalScrollIndicator={false}
          style={styles.tagsHorizontal}
          contentContainerStyle={styles.tagsHorizontalContent}>
          {tags.map((tag) => (
            <TagChip key={tag} label={tag} compact />
          ))}
        </ScrollView>
      ) : (
        <View style={styles.tagsRow}>
          {tags.map((tag) => (
            <TagChip key={tag} label={tag} compact />
          ))}
        </View>
      )
    ) : null;

  const bottomContent = (
    <>
      {description ? (
        <Text style={styles.description} numberOfLines={descriptionLines}>
          {description}
        </Text>
      ) : null}
      {footer}
    </>
  );

  if (onPress) {
    return (
      <Pressable onPress={onPress} style={[styles.card, style]}>
        {topContent}
        {tagsContent}
        {bottomContent}
      </Pressable>
    );
  }

  return (
    <View style={[styles.card, style]}>
      {onPressTop ? <Pressable onPress={onPressTop}>{topContent}</Pressable> : topContent}
      {tagsContent}
      {onPressBottom ? <Pressable onPress={onPressBottom}>{bottomContent}</Pressable> : bottomContent}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: theme.spacing.sm,
    borderRadius: theme.radii.lg,
    backgroundColor: theme.colors.cardBackground,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 18,
    ...theme.shadows.card,
  },
  topRow: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  topMeta: {
    flex: 1,
  },
  thumbnail: {
    width: 72,
    height: 72,
    borderRadius: 14,
    backgroundColor: '#E5E7EB',
  },
  thumbnailPlaceholder: {
    width: 72,
    height: 72,
    borderRadius: theme.radii.md,
    backgroundColor: theme.colors.surfaceMuted,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  thumbnailPlaceholderText: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: theme.colors.textPrimary,
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.xs,
    marginTop: 10,
  },
  address: {
    marginTop: theme.spacing.sm,
    fontSize: 13,
    color: theme.colors.textSecondary,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.xs,
    marginTop: theme.spacing.sm,
  },
  tagsHorizontal: {
    marginTop: theme.spacing.sm,
  },
  tagsHorizontalContent: {
    gap: theme.spacing.xs,
    paddingBottom: 2,
  },
  description: {
    marginTop: theme.spacing.sm,
    fontSize: 15,
    lineHeight: 22,
    color: theme.colors.textSecondary,
  },
});
