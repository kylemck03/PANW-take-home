import React, { useState } from 'react';
import { StyleSheet, View, TouchableOpacity } from 'react-native';
import { ThemedView } from './themed-view';
import { ThemedText } from './themed-text';
import { useThemeColor } from '@/hooks/use-theme-color';
import type { Insight } from '@/lib/api';

interface InsightCardProps {
  insight: Insight;
  onPress?: () => void;
  onMarkRead?: () => void;
}

export function InsightCard({ insight, onPress, onMarkRead }: InsightCardProps) {
  const [expanded, setExpanded] = useState(false);
  const tintColor = useThemeColor({}, 'tint');
  const cardBackground = useThemeColor({ light: '#ffffff', dark: '#1a1a1a' }, 'background');
  const unreadBg = useThemeColor({ light: '#f0f9ff', dark: '#1a2332' }, 'background');
  const borderColor = useThemeColor({ light: '#e5e7eb', dark: '#374151' }, 'text');
  
  const getInsightIcon = (type: string) => {
    switch (type) {
      case 'daily': return '☀️';
      case 'weekly': return '📅';
      case 'anomaly': return '⚠️';
      case 'pattern': return '🔍';
      case 'correlation': return '🔗';
      case 'trend': return '📈';
      default: return '💡';
    }
  };

  const getSeverityColor = (severity?: string) => {
    switch (severity) {
      case 'high': return '#ef4444';
      case 'moderate': return '#f59e0b';
      case 'low': return '#10b981';
      default: return tintColor;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const shouldShowExpand = insight.narrative.length > 150;
  const displayText = expanded || !shouldShowExpand 
    ? insight.narrative 
    : insight.narrative.substring(0, 150) + '...';

  return (
    <ThemedView
      style={[
        styles.card,
        { 
          backgroundColor: insight.is_read ? cardBackground : unreadBg,
          borderLeftWidth: !insight.is_read ? 4 : 0,
          borderLeftColor: !insight.is_read ? tintColor : 'transparent',
        },
      ]}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={[styles.iconContainer, { backgroundColor: tintColor + '15' }]}>
            <ThemedText style={styles.icon}>
              {getInsightIcon(insight.insight_type)}
            </ThemedText>
          </View>
          <View style={styles.headerText}>
            <ThemedText style={styles.title} numberOfLines={2}>
              {insight.title}
            </ThemedText>
            <View style={styles.metaRow}>
              <ThemedText style={styles.meta}>
                {formatDate(insight.created_at)}
              </ThemedText>
              {insight.severity && (
                <>
                  <ThemedText style={styles.metaDot}>•</ThemedText>
                  <View style={[styles.badge, { backgroundColor: getSeverityColor(insight.severity) + '20' }]}>
                    <ThemedText style={[styles.badgeText, { color: getSeverityColor(insight.severity) }]}>
                      {insight.severity}
                    </ThemedText>
                  </View>
                </>
              )}
            </View>
          </View>
        </View>
        
        {!insight.is_read && (
          <View style={[styles.unreadBadge, { backgroundColor: tintColor }]}>
            <ThemedText style={styles.unreadText}>New</ThemedText>
          </View>
        )}
      </View>

      {/* Content */}
      <View style={styles.content}>
        <ThemedText style={styles.narrative}>
          {displayText}
        </ThemedText>
        {shouldShowExpand && (
          <TouchableOpacity
            onPress={() => setExpanded(!expanded)}
            style={styles.expandButton}
          >
            <ThemedText style={[styles.expandText, { color: tintColor }]}>
              {expanded ? 'Show less' : 'Read more'}
            </ThemedText>
          </TouchableOpacity>
        )}
      </View>

      {/* Summary (if available) */}
      {insight.summary && (
        <View style={[styles.summaryBox, { backgroundColor: tintColor + '10', borderColor: tintColor + '30' }]}>
          <ThemedText style={styles.summaryLabel}>💡 Key Takeaway</ThemedText>
          <ThemedText style={styles.summary}>{insight.summary}</ThemedText>
        </View>
      )}

      {/* Footer Actions */}
      {!insight.is_read && onMarkRead && (
        <View style={styles.footer}>
          <TouchableOpacity
            onPress={(e) => {
              e.stopPropagation();
              onMarkRead();
            }}
            style={[styles.markReadButton, { backgroundColor: tintColor + '15' }]}
            activeOpacity={0.7}
          >
            <ThemedText style={[styles.markReadText, { color: tintColor }]}>
              ✓ Mark as read
            </ThemedText>
          </TouchableOpacity>
        </View>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    flex: 1,
    marginRight: 12,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  icon: {
    fontSize: 24,
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 6,
    lineHeight: 24,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  meta: {
    fontSize: 13,
    opacity: 0.6,
  },
  metaDot: {
    fontSize: 13,
    opacity: 0.4,
    marginHorizontal: 6,
  },
  unreadBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    minWidth: 50,
    alignItems: 'center',
  },
  unreadText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  content: {
    marginBottom: 16,
  },
  narrative: {
    fontSize: 15,
    lineHeight: 24,
    opacity: 0.85,
  },
  expandButton: {
    marginTop: 8,
    alignSelf: 'flex-start',
  },
  expandText: {
    fontSize: 14,
    fontWeight: '600',
  },
  summaryBox: {
    padding: 14,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
  },
  summaryLabel: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 6,
    opacity: 0.7,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  summary: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '500',
  },
  footer: {
    marginTop: 4,
  },
  markReadButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    alignItems: 'center',
  },
  markReadText: {
    fontSize: 14,
    fontWeight: '600',
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    marginLeft: 4,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
});

