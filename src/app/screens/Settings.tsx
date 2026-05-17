import React, { useState } from 'react';
import { RefreshControl, ScrollView, Switch, Text, TouchableOpacity, View } from 'react-native';
import {
  Bell,
  Bot,
  ChevronRight,
  Cloud,
  Database,
  HelpCircle,
  Info,
  LogOut,
  Moon,
  Sparkles,
  User,
} from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { UserProfile } from '@/lib/firebase';
import { LoadingSkeleton } from '@/components/app/LoadingSkeleton';
import { useAiChatDragReminderPreference } from '@/lib/preferences';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';
import { useSkeletonLoading } from '@/hooks/useSkeletonLoading';

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
  const initialLoading = useSkeletonLoading();
  const { refreshing, refresh } = usePullToRefresh();
  const isLoading = initialLoading || refreshing;

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-slate-50">
      <ScrollView
        className="flex-1"
        contentContainerClassName="px-5 pt-2 pb-28"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={refresh}
            tintColor="#172554"
            colors={['#172554']}
          />
        }
        showsVerticalScrollIndicator={false}>
        <View className="pt-4">
          <Text className="text-3xl font-black tracking-[-0.5px] text-blue-950">Settings</Text>
          <Text className="mt-2 max-w-[290px] text-sm leading-5 text-slate-600">
            Customize your learning environment and account preferences.
          </Text>
        </View>

        <SettingsSection title="ACCOUNT" className="mt-7">
          {isLoading ? (
            <SettingsRowSkeleton />
          ) : (
            <SettingsRow
              icon={<User size={17} color="#4338ca" />}
              iconClassName="bg-indigo-100"
              title={displayName}
              subtitle={email}
              onPress={onOpenProfile}
            />
          )}

          <Divider />

          {isLoading ? (
            <SettingsRowSkeleton />
          ) : (
            <SettingsRow
              icon={<Bot size={17} color="#0891b2" />}
              iconClassName="bg-cyan-100"
              title="Subscription"
              subtitle={`${plan} Active`}
              subtitleClassName="text-cyan-700"
              onPress={onOpenProfile}
            />
          )}
        </SettingsSection>

        <SettingsSection title="PREFERENCES" className="mt-5">
          <SettingsRow
            icon={<Cloud size={17} color="#172554" />}
            iconClassName="bg-blue-50"
            title="Sync & Cloud"
            rightText="Last synced 2m ago"
            onPress={() => console.log('Open sync')}
          />

          <Divider />

          <SettingsRow
            icon={<Bell size={17} color="#172554" />}
            iconClassName="bg-blue-50"
            title="Notifications"
            onPress={() => console.log('Open notifications')}
          />

          <Divider />

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

          <Divider />

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

          <Divider />

          <SettingsRow
            icon={<Database size={17} color="#172554" />}
            iconClassName="bg-blue-50"
            title="Offline Storage"
            rightText="1.2 GB used"
            onPress={() => console.log('Open offline storage')}
          />
        </SettingsSection>

        <SettingsSection title="INFORMATION" className="mt-5">
          <SettingsRow
            icon={<Info size={17} color="#172554" />}
            iconClassName="bg-blue-50"
            title="About TalinoQ"
            rightText="v2.4.0"
            onPress={() => console.log('Open about')}
          />

          <Divider />

          <SettingsRow
            icon={<HelpCircle size={17} color="#172554" />}
            iconClassName="bg-blue-50"
            title="Help & FAQ"
            onPress={() => console.log('Open help')}
          />
        </SettingsSection>

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
              className="mt-5 self-start rounded-full bg-cyan-200 px-5 py-2">
              <Text className="text-xs font-black text-teal-950">Run Diagnostic</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function SettingsSection({
  title,
  children,
  className = '',
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <View className={className}>
      <Text className="mb-2 px-4 text-xs font-black tracking-[0.8px] text-blue-950">{title}</Text>
      <View className="overflow-hidden rounded-2xl bg-white shadow-sm">{children}</View>
    </View>
  );
}

function SettingsRow({
  icon,
  iconClassName,
  title,
  subtitle,
  subtitleClassName = 'text-slate-500',
  rightText,
  onPress,
}: {
  icon: React.ReactNode;
  iconClassName?: string;
  title: string;
  subtitle?: string;
  subtitleClassName?: string;
  rightText?: string;
  onPress?: () => void;
}) {
  return (
    <TouchableOpacity
      activeOpacity={0.75}
      onPress={onPress}
      className="flex-row items-center px-4 py-4">
      <View
        className={`mr-3 h-9 w-9 items-center justify-center rounded-full ${iconClassName ?? 'bg-slate-100'}`}>
        {icon}
      </View>

      <View className="flex-1">
        <Text className="text-sm font-bold text-slate-800">{title}</Text>
        {subtitle ? (
          <Text className={`mt-0.5 text-xs font-medium ${subtitleClassName}`}>{subtitle}</Text>
        ) : null}
      </View>

      {rightText ? (
        <Text className="mr-2 text-xs font-semibold text-slate-500">{rightText}</Text>
      ) : null}
      <ChevronRight size={17} color="#94a3b8" />
    </TouchableOpacity>
  );
}

function SettingsRowSkeleton() {
  return (
    <View className="flex-row items-center px-4 py-4">
      <LoadingSkeleton height={36} width={36} radius={999} style={{ marginRight: 12 }} />
      <View className="flex-1">
        <LoadingSkeleton height={15} width="48%" radius={7} />
        <LoadingSkeleton height={12} width="72%" radius={6} style={{ marginTop: 6 }} />
      </View>
      <LoadingSkeleton height={17} width={17} radius={8} />
    </View>
  );
}

function Divider() {
  return <View className="mx-4 h-px bg-slate-200" />;
}
