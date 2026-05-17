import { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const AI_CHAT_DRAG_REMINDER_KEY = 'talinoq:ai-chat-drag-reminder-enabled:v1';

type PreferenceListener = (enabled: boolean) => void;

const aiChatDragReminderListeners = new Set<PreferenceListener>();

async function readBooleanPreference(key: string, fallback: boolean) {
  try {
    const storedValue = await AsyncStorage.getItem(key);

    if (storedValue === null) {
      return fallback;
    }

    return storedValue === 'true';
  } catch {
    return fallback;
  }
}

export async function getAiChatDragReminderEnabled() {
  return readBooleanPreference(AI_CHAT_DRAG_REMINDER_KEY, true);
}

export async function setAiChatDragReminderEnabled(enabled: boolean) {
  try {
    await AsyncStorage.setItem(AI_CHAT_DRAG_REMINDER_KEY, String(enabled));
  } catch {
    // The in-memory setting still updates for the current session.
  }

  aiChatDragReminderListeners.forEach((listener) => listener(enabled));
}

export function subscribeToAiChatDragReminderPreference(listener: PreferenceListener) {
  aiChatDragReminderListeners.add(listener);

  return () => {
    aiChatDragReminderListeners.delete(listener);
  };
}

export function useAiChatDragReminderPreference() {
  const [enabled, setEnabled] = useState(true);

  useEffect(() => {
    let isMounted = true;

    getAiChatDragReminderEnabled().then((value) => {
      if (isMounted) {
        setEnabled(value);
      }
    });

    const unsubscribe = subscribeToAiChatDragReminderPreference((value) => {
      setEnabled(value);
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  const updateEnabled = (value: boolean) => {
    setEnabled(value);
    void setAiChatDragReminderEnabled(value);
  };

  return [enabled, updateEnabled] as const;
}
