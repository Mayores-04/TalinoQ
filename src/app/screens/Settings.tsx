import React, { useState } from 'react';
import {
  Alert,
  RefreshControl,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  Bell,
  Bot,
  Cloud,
  Database,
  HelpCircle,
  Info,
  LogOut,
  Moon,
  Sparkles,
  User,
} from 'lucide-react-native';
import type { UserProfile } from '@/lib/firebase';
import { useAiChatDragReminderPreference } from '@/lib/preferences';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';
import { AppScreen } from '@/components/layout/AppScreen';
import { TqDivider, TqListRow, TqSection } from '@/components/ui/talinoq';

type SettingsPageProps = {
  userProfile?: UserProfile | null;
  onBack?: () => void;
  onOpenHome?: () => void;
  onOpenProfile?: () => void;
  onOpenReviewers?: () => void;
  onOpenCreate?: () => void;
  onOpenProgress?: () => void;
  onOpenAIChat?: () => void;
  onSignOut?: () => void;
};

export function SettingsPage({ userProfile, onOpenProfile, onSignOut }: SettingsPageProps) {
  const [appearance, setAppearance] = useState<'light' | 'dark'>('light');
  const displayName = userProfile?.displayName ?? 'TalinoQ Scholar';
  const email = userProfile?.email ?? 'Account details loading';
  const plan = userProfile?.plan ?? 'Free Plan';
  const [dragReminderEnabled, setDragReminderEnabled] = useAiChatDragReminderPreference();
  const { refreshing, refresh } = usePullToRefresh();
  const showInfo = (title: string, message: string) => {
    Alert.alert(title, message);
  };

  return (
    <AppScreen
      edges={['top']}
      scroll
      scrollProps={{
        refreshControl: (
          <RefreshControl
            refreshing={refreshing}
            onRefresh={refresh}
            tintColor="#172554"
            colors={['#172554']}
          />
        ),
      }}>
        <View className="pt-4">
          <Text className="text-3xl font-black tracking-[-0.5px] text-blue-950">Settings</Text>
          <Text className="mt-2 max-w-[290px] text-sm leading-5 text-slate-600">
            Customize your learning environment and account preferences.
          </Text>
        </View>

        <TqSection title="ACCOUNT" className="mt-7">
          <TqListRow
            icon={<User size={17} color="#4338ca" />}
            iconClassName="bg-indigo-100"
            title={displayName}
            subtitle={email}
            onPress={onOpenProfile}
          />

          <TqDivider />

          <TqListRow
            icon={<Bot size={17} color="#0891b2" />}
            iconClassName="bg-cyan-100"
            title="Subscription"
            subtitle={`${plan} Active`}
            subtitleClassName="text-cyan-700"
            onPress={onOpenProfile}
          />
        </TqSection>

        <TqSection title="PREFERENCES" className="mt-5">
          <TqListRow
            icon={<Cloud size={17} color="#172554" />}
            iconClassName="bg-blue-50"
            title="Sync & Cloud"
            rightText="Last synced 2m ago"
            onPress={() =>
              showInfo('Sync & Cloud', 'TalinoQ saves your libraries, reviewers, materials, and AI chats to your account.')
            }
          />

          <TqDivider />

          <TqListRow
            icon={<Bell size={17} color="#172554" />}
            iconClassName="bg-blue-50"
            title="Notifications"
            onPress={() =>
              showInfo('Notifications', 'Notifications are managed from the TalinoQ notification panel.')
            }
          />

          <TqDivider />

          <View className="flex-row items-center px-4 py-4">
            <View className="mr-3 h-9 w-9 items-center justify-center rounded-full bg-cyan-100">
              <Bot size={17} color="#0891b2" />
            </View>

            <View className="flex-1">
              <Text className="text-sm font-bold text-slate-800">AI Drag Reminder</Text>
              <Text className="mt-0.5 text-xs font-medium text-slate-500">
                Show a 5-second hint for the draggable AI button.
              </Text>
            </View>

            <Switch value={dragReminderEnabled} onValueChange={setDragReminderEnabled} />
          </View>

          <TqDivider />

          <View className="flex-row items-center px-4 py-4">
            <View className="mr-3 h-9 w-9 items-center justify-center rounded-full bg-blue-50">
              <Moon size={17} color="#172554" />
            </View>

            <Text className="flex-1 text-sm font-semibold text-slate-800">Appearance</Text>

            <View className="flex-row rounded-full bg-slate-100 p-1">
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => setAppearance('light')}
                className={`rounded-full px-4 py-1.5 ${appearance === 'light' ? 'bg-white shadow-sm' : ''}`}>
                <Text
                  className={`text-xs font-bold ${
                    appearance === 'light' ? 'text-blue-950' : 'text-slate-500'
                  }`}>
                  Light
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => setAppearance('dark')}
                className={`rounded-full px-4 py-1.5 ${appearance === 'dark' ? 'bg-blue-950 shadow-sm' : ''}`}>
                <Text
                  className={`text-xs font-bold ${
                    appearance === 'dark' ? 'text-white' : 'text-slate-500'
                  }`}>
                  Dark
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          <TqDivider />

          <TqListRow
            icon={<Database size={17} color="#172554" />}
            iconClassName="bg-blue-50"
            title="Offline Storage"
            rightText="1.2 GB used"
            onPress={() =>
              showInfo('Offline Storage', 'TalinoQ keeps a local cache for material drafts and sync recovery.')
            }
          />
        </TqSection>

        <TqSection title="INFORMATION" className="mt-5">
          <TqListRow
            icon={<Info size={17} color="#172554" />}
            iconClassName="bg-blue-50"
            title="About TalinoQ"
            rightText="v2.4.0"
            onPress={() =>
              showInfo('About TalinoQ', 'TalinoQ helps you scan, review, and improve with organized reviewers and AI study support.')
            }
          />

          <TqDivider />

          <TqListRow
            icon={<HelpCircle size={17} color="#172554" />}
            iconClassName="bg-blue-50"
            title="Help & FAQ"
            onPress={() =>
              showInfo('Help & FAQ', 'Create a library, upload materials, then generate reviewers or ask TalinoQ AI for help.')
            }
          />
        </TqSection>

        <TouchableOpacity
          activeOpacity={0.85}
          onPress={onSignOut}
          className="mt-5 flex-row items-center justify-center gap-2 rounded-xl border border-red-300 bg-white py-4">
          <LogOut size={17} color="#ef4444" />
          <Text className="text-sm font-black text-red-600">Sign Out of Account</Text>
        </TouchableOpacity>

        <View className="mt-10 overflow-hidden rounded-2xl bg-teal-950 p-5">
          <View className="absolute inset-0 bg-cyan-700 opacity-40" />

          <View className="relative">
            <View className="flex-row items-center gap-2">
              <Sparkles size={20} color="#ffffff" />
              <Text className="text-2xl font-black text-white">AI Personalization</Text>
            </View>

            <Text className="mt-3 text-sm leading-5 text-cyan-50">
              TalinoQ AI adapts to your settings to optimize your study sessions. Your cloud sync
              and storage preferences help us provide seamless cross-platform tutoring.
            </Text>

            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() =>
                showInfo(
                  'Diagnostic Complete',
                  'Your account settings, AI preference, and local app configuration are available.'
                )
              }
              className="mt-5 self-start rounded-full bg-cyan-200 px-5 py-2">
              <Text className="text-xs font-black text-teal-950">Run Diagnostic</Text>
            </TouchableOpacity>
          </View>
        </View>
    </AppScreen>
  );
}
