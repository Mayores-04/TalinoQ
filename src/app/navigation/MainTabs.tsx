import React, { useState } from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { HomeDashboard } from '@/app/pages/HomeDashboard';
import { ReviewersPage } from '@/app/pages/ReviewersPage';

export default function MainTabs() {
  const [tab, setTab] = useState<'home' | 'reviewers' | 'create' | 'progress' | 'ai'>('home');

  if (tab === 'home') {
    return (
      <View style={{ flex: 1 }}>
        <HomeDashboard
          onCreateReviewer={() => setTab('create')}
          onOpenReviewers={() => setTab('reviewers')}
          onOpenProgress={() => setTab('progress')}
          onOpenAIChat={() => setTab('ai')}
          onOpenWeakTopics={() => setTab('reviewers')}
        />
        <BottomNav active={tab} onPress={setTab} />
      </View>
    );
  }

  if (tab === 'reviewers') {
    return (
      <View style={{ flex: 1 }}>
        <ReviewersPage
          onBack={() => setTab('home')}
          onOpenHome={() => setTab('home')}
          onOpenCreate={() => setTab('create')}
          onCreateReviewer={() => setTab('create')}
          onOpenProgress={() => setTab('progress')}
          onOpenAIChat={() => setTab('ai')}
        />
        <BottomNav active={tab} onPress={setTab} />
      </View>
    );
  }

  // Placeholder screens for create/progress/ai
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <Text style={{ fontSize: 16, fontWeight: '700' }}>{tab.toUpperCase()}</Text>
      <BottomNav active={tab} onPress={setTab} />
    </View>
  );
}

function BottomNav({ active, onPress }: { active: string; onPress: (t: any) => void }) {
  return (
    <View style={styles.nav}>
      <NavButton label="Home" active={active === 'home'} onPress={() => onPress('home')} />
      <NavButton
        label="Reviewers"
        active={active === 'reviewers'}
        onPress={() => onPress('reviewers')}
      />
      <NavButton label="Create" active={active === 'create'} onPress={() => onPress('create')} />
      <NavButton
        label="Progress"
        active={active === 'progress'}
        onPress={() => onPress('progress')}
      />
      <NavButton label="AI" active={active === 'ai'} onPress={() => onPress('ai')} />
    </View>
  );
}

function NavButton({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity style={[styles.btn, active ? styles.btnActive : undefined]} onPress={onPress}>
      <Text style={[styles.label, active ? styles.labelActive : undefined]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  nav: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    backgroundColor: '#fff',
  },
  btn: {
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  btnActive: {
    backgroundColor: '#ecfdf5',
  },
  label: {
    fontSize: 12,
    color: '#334155',
    fontWeight: '700',
  },
  labelActive: {
    color: '#064e4a',
  },
});
