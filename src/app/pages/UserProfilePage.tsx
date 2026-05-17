import { useMemo, useState } from 'react';
import {
  Alert,
  Image,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { User } from 'firebase/auth';
import {
  ArrowLeft,
  ChevronRight,
  Database,
  Edit3,
  Flame,
  Lock,
  LogOut,
  Medal,
  RefreshCw,
  Save,
  ShieldCheck,
  UserRound,
} from 'lucide-react-native';

import { markUserProfileSynced, updateUserProfileDetails, type UserProfile } from '@/lib/firebase';
import { LoadingSkeleton } from '@/components/app/LoadingSkeleton';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';
import { useSkeletonLoading } from '@/hooks/useSkeletonLoading';

type UserProfilePageProps = {
  currentUser: User | null;
  userProfile: UserProfile | null;
  onBack: () => void;
  onSignOut: () => void;
};

type PanelMode = 'edit' | 'sync' | 'privacy' | 'data' | null;

export function UserProfilePage({
  currentUser,
  userProfile,
  onBack,
  onSignOut,
}: UserProfilePageProps) {
  const profile = useMemo(() => {
    return (
      userProfile ?? {
        uid: currentUser?.uid ?? 'guest',
        displayName: currentUser?.displayName ?? 'TalinoQ Scholar',
        firstName: currentUser?.displayName?.split(/\s+/)[0] ?? 'Scholar',
        email: currentUser?.email ?? 'Guest account',
        photoURL: currentUser?.photoURL ?? null,
        plan: 'Free Plan',
        track: 'Academic Scholar',
        levelTitle: 'Level 12 Master',
        xp: 8450,
        xpGoal: 10000,
        studyStreak: 12,
        rankLabel: 'Top 5%',
      }
    );
  }, [currentUser, userProfile]);

  const [panelMode, setPanelMode] = useState<PanelMode>(null);
  const [displayName, setDisplayName] = useState(profile.displayName);
  const [firstName, setFirstName] = useState(profile.firstName);
  const [isSaving, setIsSaving] = useState(false);
  const [cloudSync, setCloudSync] = useState(true);
  const [privateProfile, setPrivateProfile] = useState(true);
  const [analyticsSharing, setAnalyticsSharing] = useState(false);
  const initialLoading = useSkeletonLoading();

  const initials = profile.displayName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((name) => name[0]?.toUpperCase())
    .join('');
  const xpPercentage =
    `${Math.min(100, Math.round((profile.xp / profile.xpGoal) * 100))}%` as `${number}%`;

  const openPanel = (mode: PanelMode) => {
    setDisplayName(profile.displayName);
    setFirstName(profile.firstName);
    setPanelMode(mode);
  };

  const saveProfile = async () => {
    if (!currentUser) {
      Alert.alert('Profile unavailable', 'Sign in again to update your account details.');
      return;
    }

    setIsSaving(true);

    try {
      await updateUserProfileDetails(currentUser, { displayName, firstName });
      setPanelMode(null);
    } catch (error) {
      Alert.alert(
        'Unable to save profile',
        error instanceof Error ? error.message : 'Please try again in a moment.'
      );
    } finally {
      setIsSaving(false);
    }
  };

  const syncProfile = async (showAlert: boolean) => {
    if (!currentUser) {
      if (showAlert) {
        Alert.alert('Sync unavailable', 'Sign in again to sync this account.');
      }
      return;
    }

    try {
      await markUserProfileSynced(currentUser);
      if (showAlert) {
        Alert.alert('Sync complete', 'Your account profile has been synced.');
      }
    } catch (error) {
      if (showAlert) {
        Alert.alert(
          'Unable to sync',
          error instanceof Error ? error.message : 'Please try again in a moment.'
        );
      }
    }
  };
  const runManualSync = () => syncProfile(true);
  const { refreshing, refresh } = usePullToRefresh({ onRefresh: () => syncProfile(false) });
  const isLoading = initialLoading || refreshing;

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity
          activeOpacity={0.75}
          accessibilityRole="button"
          accessibilityLabel="Go back"
          onPress={onBack}
          style={styles.headerButton}>
          <ArrowLeft size={20} color="#172554" />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>TalinoQ</Text>

        <TouchableOpacity
          activeOpacity={0.75}
          accessibilityRole="button"
          accessibilityLabel="Sync account"
          onPress={runManualSync}
          style={styles.headerButton}>
          <RefreshCw size={18} color="#172554" />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={refresh}
            tintColor="#172554"
            colors={['#172554']}
          />
        }
        showsVerticalScrollIndicator={false}>
        {isLoading ? (
          <UserProfileSkeleton />
        ) : (
          <>
            <View style={styles.identityBlock}>
              <View style={styles.avatarWrap}>
                {profile.photoURL ? (
                  <Image
                    source={{ uri: profile.photoURL }}
                    resizeMode="cover"
                    style={styles.avatar}
                  />
                ) : (
                  <View style={styles.avatarFallback}>
                    <Text style={styles.avatarInitials}>{initials || 'TQ'}</Text>
                  </View>
                )}

                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => openPanel('edit')}
                  style={styles.editBadge}>
                  <Edit3 size={13} color="#ffffff" />
                </TouchableOpacity>
              </View>

              <Text style={styles.name}>{profile.displayName}</Text>
              <Text style={styles.email}>{profile.email}</Text>

              <View style={styles.pillsRow}>
                <View style={styles.planPill}>
                  <Text style={styles.planPillText}>{profile.plan}</Text>
                </View>
                <View style={styles.trackPill}>
                  <Text style={styles.trackPillText}>{profile.track}</Text>
                </View>
              </View>
            </View>

            <View style={styles.standingCard}>
              <View style={styles.standingTop}>
                <View>
                  <Text style={styles.cardEyebrow}>CURRENT STANDING</Text>
                  <Text style={styles.levelTitle}>{profile.levelTitle}</Text>
                </View>
                <View style={styles.medalBox}>
                  <Medal size={20} color="#1e1b7a" />
                </View>
              </View>

              <View style={styles.xpRow}>
                <Text style={styles.xpLabel}>XP Progress</Text>
                <Text style={styles.xpValue}>
                  {profile.xp.toLocaleString()} / {profile.xpGoal.toLocaleString()}
                </Text>
              </View>

              <View style={styles.xpTrack}>
                <View style={[styles.xpFill, { width: xpPercentage }]} />
              </View>
            </View>

            <LinearGradient
              colors={['#11979e', '#4ad4e2']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.streakCard}>
              <View>
                <Flame size={24} color="#ffffff" fill="#ffffff" />
                <Text style={styles.streakNumber}>{profile.studyStreak}</Text>
                <Text style={styles.streakText}>DAY STUDY STREAK</Text>
              </View>

              <View style={styles.rankBadge}>
                <Text style={styles.rankText}>{profile.rankLabel}</Text>
              </View>
            </LinearGradient>

            <View style={styles.accountCard}>
              <Text style={styles.sectionLabel}>ACCOUNT SETTINGS</Text>
              <ProfileActionRow
                icon={<UserRound size={17} color="#1e1b7a" />}
                title="Edit Profile"
                onPress={() => openPanel('edit')}
              />
              <ProfileActionRow
                icon={<RefreshCw size={17} color="#1e1b7a" />}
                title="Sync Settings"
                onPress={() => openPanel('sync')}
              />
              <ProfileActionRow
                icon={<Lock size={17} color="#1e1b7a" />}
                title="Privacy Settings"
                onPress={() => openPanel('privacy')}
              />
              <ProfileActionRow
                icon={<Database size={17} color="#1e1b7a" />}
                title="Data Management"
                onPress={() => openPanel('data')}
              />
              <ProfileActionRow
                danger
                icon={<LogOut size={17} color="#ef4444" />}
                title="Logout"
                onPress={onSignOut}
              />
            </View>

            <LinearGradient
              colors={['#172554', '#1e1b7a']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.upgradeCard}>
              <Text style={styles.upgradeTitle}>Upgrade Your Learning</Text>
              <Text style={styles.upgradeCopy}>
                Unlock advanced AI analysis and unlimited offline storage.
              </Text>
              <TouchableOpacity activeOpacity={0.84} style={styles.upgradeButton}>
                <Text style={styles.upgradeButtonText}>Explore Features</Text>
              </TouchableOpacity>
            </LinearGradient>
          </>
        )}
      </ScrollView>

      <Modal visible={panelMode !== null} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{getPanelTitle(panelMode)}</Text>

            {panelMode === 'edit' ? (
              <View style={styles.modalBody}>
                <ProfileInput label="Full name" value={displayName} onChangeText={setDisplayName} />
                <ProfileInput label="First name" value={firstName} onChangeText={setFirstName} />
                <TouchableOpacity
                  activeOpacity={0.84}
                  onPress={saveProfile}
                  disabled={isSaving}
                  style={styles.modalPrimaryButton}>
                  <Save size={16} color="#ffffff" />
                  <Text style={styles.modalPrimaryText}>
                    {isSaving ? 'Saving...' : 'Save Profile'}
                  </Text>
                </TouchableOpacity>
              </View>
            ) : null}

            {panelMode === 'sync' ? (
              <View style={styles.modalBody}>
                <ToggleRow label="Cloud sync" value={cloudSync} onValueChange={setCloudSync} />
                <Text style={styles.modalCopy}>
                  Last sync: {profile.lastSyncedAt ? 'recently updated' : 'not synced yet'}
                </Text>
                <TouchableOpacity
                  activeOpacity={0.84}
                  onPress={runManualSync}
                  style={styles.modalPrimaryButton}>
                  <RefreshCw size={16} color="#ffffff" />
                  <Text style={styles.modalPrimaryText}>Sync Now</Text>
                </TouchableOpacity>
              </View>
            ) : null}

            {panelMode === 'privacy' ? (
              <View style={styles.modalBody}>
                <ToggleRow
                  label="Private learning profile"
                  value={privateProfile}
                  onValueChange={setPrivateProfile}
                />
                <ToggleRow
                  label="Anonymous analytics"
                  value={analyticsSharing}
                  onValueChange={setAnalyticsSharing}
                />
                <View style={styles.privacyNote}>
                  <ShieldCheck size={18} color="#0f766e" />
                  <Text style={styles.privacyNoteText}>
                    Your notes and generated reviewers stay tied to this account only.
                  </Text>
                </View>
              </View>
            ) : null}

            {panelMode === 'data' ? (
              <View style={styles.modalBody}>
                <DataMetric label="Saved reviewers" value="0" />
                <DataMetric label="Offline storage" value="Ready" />
                <DataMetric label="Account document" value={currentUser ? 'Connected' : 'Guest'} />
              </View>
            ) : null}

            <TouchableOpacity
              activeOpacity={0.76}
              onPress={() => setPanelMode(null)}
              style={styles.modalSecondaryButton}>
              <Text style={styles.modalSecondaryText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function UserProfileSkeleton() {
  return (
    <View>
      <View style={styles.identityBlock}>
        <LoadingSkeleton height={94} width={94} radius={999} />
        <LoadingSkeleton height={29} width="58%" radius={10} style={styles.skeletonNameGap} />
        <LoadingSkeleton height={15} width="72%" radius={7} style={styles.skeletonEmailGap} />
        <View style={styles.pillsRow}>
          <LoadingSkeleton height={28} width={92} radius={999} />
          <LoadingSkeleton height={28} width={132} radius={999} />
        </View>
      </View>

      <View style={styles.standingCard}>
        <View style={styles.standingTop}>
          <View>
            <LoadingSkeleton height={12} width={126} radius={6} />
            <LoadingSkeleton height={22} width={166} radius={8} style={styles.skeletonEmailGap} />
          </View>
          <LoadingSkeleton height={45} width={45} radius={6} />
        </View>
        <LoadingSkeleton height={12} radius={6} style={styles.skeletonWideGap} />
        <LoadingSkeleton height={8} radius={999} style={styles.skeletonEmailGap} />
      </View>

      <LoadingSkeleton height={118} radius={10} style={styles.skeletonSectionGap} />
      <LoadingSkeleton height={292} radius={10} style={styles.skeletonSectionGap} />
      <LoadingSkeleton height={140} radius={10} style={styles.skeletonSectionGap} />
    </View>
  );
}

function ProfileActionRow({
  danger,
  icon,
  title,
  onPress,
}: {
  danger?: boolean;
  icon: React.ReactNode;
  title: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity activeOpacity={0.75} onPress={onPress} style={styles.actionRow}>
      <View style={[styles.actionIcon, danger && styles.actionIconDanger]}>{icon}</View>
      <Text style={[styles.actionTitle, danger && styles.actionTitleDanger]}>{title}</Text>
      <ChevronRight size={16} color={danger ? '#ef4444' : '#94a3b8'} />
    </TouchableOpacity>
  );
}

function ProfileInput({
  label,
  value,
  onChangeText,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
}) {
  return (
    <View>
      <Text style={styles.inputLabel}>{label}</Text>
      <TextInput
        autoCapitalize="words"
        onChangeText={onChangeText}
        style={styles.input}
        value={value}
      />
    </View>
  );
}

function ToggleRow({
  label,
  value,
  onValueChange,
}: {
  label: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
}) {
  return (
    <View style={styles.toggleRow}>
      <Text style={styles.toggleLabel}>{label}</Text>
      <Switch value={value} onValueChange={onValueChange} />
    </View>
  );
}

function DataMetric({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.dataMetric}>
      <Text style={styles.dataMetricLabel}>{label}</Text>
      <Text style={styles.dataMetricValue}>{value}</Text>
    </View>
  );
}

function getPanelTitle(mode: PanelMode) {
  switch (mode) {
    case 'edit':
      return 'Edit Profile';
    case 'sync':
      return 'Sync Settings';
    case 'privacy':
      return 'Privacy Settings';
    case 'data':
      return 'Data Management';
    default:
      return 'Account Settings';
  }
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: '#eef6fb',
    flex: 1,
  },
  header: {
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderBottomColor: '#dbe4ee',
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerButton: {
    alignItems: 'center',
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  headerTitle: {
    color: '#1e1b7a',
    fontSize: 18,
    fontWeight: '900',
  },
  scrollContent: {
    padding: 18,
    paddingBottom: 120,
  },
  identityBlock: {
    alignItems: 'center',
    paddingTop: 16,
  },
  avatarWrap: {
    height: 94,
    position: 'relative',
    width: 94,
  },
  avatar: {
    borderColor: '#ffffff',
    borderRadius: 999,
    borderWidth: 4,
    height: 94,
    width: 94,
  },
  avatarFallback: {
    alignItems: 'center',
    backgroundColor: '#172554',
    borderColor: '#ffffff',
    borderRadius: 999,
    borderWidth: 4,
    height: 94,
    justifyContent: 'center',
    width: 94,
  },
  avatarInitials: {
    color: '#ffffff',
    fontSize: 28,
    fontWeight: '900',
  },
  editBadge: {
    alignItems: 'center',
    backgroundColor: '#079aa0',
    borderColor: '#ffffff',
    borderRadius: 999,
    borderWidth: 3,
    bottom: 4,
    height: 28,
    justifyContent: 'center',
    position: 'absolute',
    right: 0,
    width: 28,
  },
  name: {
    color: '#111827',
    fontSize: 24,
    fontWeight: '900',
    marginTop: 16,
  },
  email: {
    color: '#64748b',
    fontSize: 13,
    marginTop: 3,
  },
  pillsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  planPill: {
    backgroundColor: '#262192',
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 7,
  },
  planPillText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '800',
  },
  trackPill: {
    backgroundColor: '#49d6e8',
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 7,
  },
  trackPillText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '800',
  },
  standingCard: {
    backgroundColor: '#ffffff',
    borderLeftColor: '#262192',
    borderLeftWidth: 4,
    borderRadius: 8,
    marginTop: 26,
    padding: 18,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.06,
    shadowRadius: 20,
  },
  standingTop: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  cardEyebrow: {
    color: '#64748b',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.1,
  },
  levelTitle: {
    color: '#1e1b7a',
    fontSize: 18,
    fontWeight: '900',
    marginTop: 5,
  },
  medalBox: {
    alignItems: 'center',
    backgroundColor: '#ede9fe',
    borderRadius: 6,
    height: 45,
    justifyContent: 'center',
    width: 45,
  },
  xpRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 18,
  },
  xpLabel: {
    color: '#334155',
    fontSize: 11,
    fontWeight: '800',
  },
  xpValue: {
    color: '#1e1b7a',
    fontSize: 11,
    fontWeight: '900',
  },
  xpTrack: {
    backgroundColor: '#dbeafe',
    borderRadius: 999,
    height: 8,
    marginTop: 8,
    overflow: 'hidden',
  },
  xpFill: {
    backgroundColor: '#0097a1',
    height: '100%',
  },
  streakCard: {
    borderRadius: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 22,
    minHeight: 118,
    padding: 20,
  },
  streakNumber: {
    color: '#ffffff',
    fontSize: 34,
    fontWeight: '900',
    lineHeight: 38,
  },
  streakText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.6,
  },
  rankBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.26)',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  rankText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '900',
  },
  accountCard: {
    backgroundColor: '#ffffff',
    borderRadius: 10,
    marginTop: 26,
    overflow: 'hidden',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.05,
    shadowRadius: 20,
  },
  sectionLabel: {
    borderBottomColor: '#e2e8f0',
    borderBottomWidth: 1,
    color: '#64748b',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.4,
    paddingHorizontal: 20,
    paddingVertical: 18,
  },
  actionRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 14,
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  actionIcon: {
    alignItems: 'center',
    backgroundColor: '#e0f2fe',
    borderRadius: 999,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  actionIconDanger: {
    backgroundColor: '#fee2e2',
  },
  actionTitle: {
    color: '#111827',
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
  },
  actionTitleDanger: {
    color: '#dc2626',
  },
  upgradeCard: {
    borderRadius: 10,
    marginTop: 26,
    minHeight: 140,
    padding: 22,
  },
  upgradeTitle: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '900',
  },
  upgradeCopy: {
    color: '#c7d2fe',
    fontSize: 13,
    lineHeight: 19,
    marginTop: 9,
    maxWidth: 245,
  },
  upgradeButton: {
    alignSelf: 'flex-start',
    backgroundColor: '#0ea5a4',
    borderRadius: 999,
    marginTop: 14,
    paddingHorizontal: 18,
    paddingVertical: 9,
  },
  upgradeButtonText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '900',
  },
  modalBackdrop: {
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
    flex: 1,
    justifyContent: 'center',
    padding: 22,
  },
  modalCard: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    padding: 20,
    width: '100%',
  },
  modalTitle: {
    color: '#111827',
    fontSize: 20,
    fontWeight: '900',
  },
  modalBody: {
    gap: 14,
    marginTop: 18,
  },
  inputLabel: {
    color: '#64748b',
    fontSize: 11,
    fontWeight: '900',
    marginBottom: 7,
  },
  input: {
    borderColor: '#cbd5e1',
    borderRadius: 10,
    borderWidth: 1,
    color: '#111827',
    fontSize: 15,
    fontWeight: '700',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  modalPrimaryButton: {
    alignItems: 'center',
    backgroundColor: '#007a78',
    borderRadius: 10,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    marginTop: 4,
    paddingVertical: 13,
  },
  modalPrimaryText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '900',
  },
  modalSecondaryButton: {
    alignItems: 'center',
    marginTop: 14,
    paddingVertical: 10,
  },
  modalSecondaryText: {
    color: '#64748b',
    fontSize: 13,
    fontWeight: '900',
  },
  modalCopy: {
    color: '#64748b',
    fontSize: 13,
    lineHeight: 19,
  },
  toggleRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  toggleLabel: {
    color: '#111827',
    fontSize: 14,
    fontWeight: '800',
  },
  privacyNote: {
    alignItems: 'center',
    backgroundColor: '#ecfdf5',
    borderRadius: 12,
    flexDirection: 'row',
    gap: 10,
    padding: 12,
  },
  privacyNoteText: {
    color: '#0f766e',
    flex: 1,
    fontSize: 12,
    lineHeight: 17,
  },
  dataMetric: {
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 14,
  },
  dataMetricLabel: {
    color: '#475569',
    fontSize: 13,
    fontWeight: '800',
  },
  dataMetricValue: {
    color: '#172554',
    fontSize: 13,
    fontWeight: '900',
  },
  skeletonNameGap: {
    marginTop: 16,
  },
  skeletonEmailGap: {
    marginTop: 7,
  },
  skeletonWideGap: {
    marginTop: 20,
  },
  skeletonSectionGap: {
    marginTop: 26,
  },
});
