import { supabase } from './supabase';
import { load, save } from '@/utils/storage';

export type CoachMessage = {
  id?: string;
  conversation_id: string;
  user_id?: string;
  role: 'user' | 'assistant';
  content: string;
  context_data?: Record<string, any>;
  created_at?: string;
};

export type CoachConversation = {
  id: string;
  user_id?: string;
  title?: string;
  context_page?: string;
  context_data?: Record<string, any>;
  is_active: boolean;
  message_count: number;
  created_at?: string;
  updated_at?: string;
  last_message_at?: string;
};

const FALLBACK_CONVERSATION_ID = 'local-conversation';

export async function getOrCreateActiveConversation(contextPage?: string): Promise<string> {
  try {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return FALLBACK_CONVERSATION_ID;
    }

    const { data: activeConv } = await supabase
      .from('coach_conversations')
      .select('id')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (activeConv) {
      return activeConv.id;
    }

    const { data: newConv, error } = await supabase
      .from('coach_conversations')
      .insert({
        user_id: user.id,
        title: 'AI Coach Chat',
        context_page: contextPage,
        is_active: true,
      })
      .select('id')
      .single();

    if (error || !newConv) {
      console.error('Error creating conversation:', error);
      return FALLBACK_CONVERSATION_ID;
    }

    return newConv.id;
  } catch (error) {
    console.error('Error in getOrCreateActiveConversation:', error);
    return FALLBACK_CONVERSATION_ID;
  }
}

export async function saveCoachMessage(
  conversationId: string,
  role: 'user' | 'assistant',
  content: string,
  contextData?: Record<string, any>
): Promise<boolean> {
  try {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      saveMessageToLocalStorage(role, content);
      return true;
    }

    if (conversationId === FALLBACK_CONVERSATION_ID) {
      conversationId = await getOrCreateActiveConversation();
      if (conversationId === FALLBACK_CONVERSATION_ID) {
        saveMessageToLocalStorage(role, content);
        return true;
      }
    }

    const { error } = await supabase
      .from('coach_messages')
      .insert({
        conversation_id: conversationId,
        user_id: user.id,
        role,
        content,
        context_data: contextData || null,
      });

    if (error) {
      console.error('Error saving coach message:', error);
      saveMessageToLocalStorage(role, content);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error in saveCoachMessage:', error);
    saveMessageToLocalStorage(role, content);
    return false;
  }
}

export async function getConversationMessages(
  conversationId: string,
  limit: number = 50
): Promise<CoachMessage[]> {
  try {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user || conversationId === FALLBACK_CONVERSATION_ID) {
      return getMessagesFromLocalStorage();
    }

    const { data, error } = await supabase
      .from('coach_messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })
      .limit(limit);

    if (error) {
      console.error('Error fetching messages:', error);
      return getMessagesFromLocalStorage();
    }

    return data || [];
  } catch (error) {
    console.error('Error in getConversationMessages:', error);
    return getMessagesFromLocalStorage();
  }
}

export async function getAllConversations(): Promise<CoachConversation[]> {
  try {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return [];
    }

    const { data, error } = await supabase
      .from('coach_conversations')
      .select('*')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('Error fetching conversations:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error in getAllConversations:', error);
    return [];
  }
}

export async function clearConversationHistory(conversationId?: string): Promise<boolean> {
  try {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      clearLocalStorageMessages();
      return true;
    }

    if (conversationId) {
      const { error: msgError } = await supabase
        .from('coach_messages')
        .delete()
        .eq('conversation_id', conversationId);

      const { error: convError } = await supabase
        .from('coach_conversations')
        .delete()
        .eq('id', conversationId);

      if (msgError || convError) {
        console.error('Error deleting conversation:', msgError || convError);
        return false;
      }
    } else {
      const { error: msgError } = await supabase
        .from('coach_messages')
        .delete()
        .eq('user_id', user.id);

      const { error: convError } = await supabase
        .from('coach_conversations')
        .delete()
        .eq('user_id', user.id);

      if (msgError || convError) {
        console.error('Error deleting all conversations:', msgError || convError);
        return false;
      }
    }

    clearLocalStorageMessages();
    return true;
  } catch (error) {
    console.error('Error in clearConversationHistory:', error);
    return false;
  }
}

function saveMessageToLocalStorage(role: 'user' | 'assistant', content: string): void {
  const messages = load<Array<{ role: string; text: string; ts: number }>>('chat:msgs', []);
  messages.push({ role: role === 'assistant' ? 'assistant' : 'user', text: content, ts: Date.now() });
  save('chat:msgs', messages);
}

function getMessagesFromLocalStorage(): CoachMessage[] {
  const messages = load<Array<{ role: string; text: string; ts: number }>>('chat:msgs', []);
  return messages.map((msg) => ({
    conversation_id: FALLBACK_CONVERSATION_ID,
    role: msg.role === 'assistant' ? 'assistant' : 'user',
    content: msg.text,
    created_at: new Date(msg.ts).toISOString(),
  }));
}

function clearLocalStorageMessages(): void {
  save('chat:msgs', []);
}

export async function migrateLocalMessagesToSupabase(): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return;

    const localMessages = getMessagesFromLocalStorage();

    if (localMessages.length === 0) return;

    const conversationId = await getOrCreateActiveConversation();

    if (conversationId === FALLBACK_CONVERSATION_ID) {
      console.log('Could not create conversation for migration');
      return;
    }

    for (const msg of localMessages) {
      await saveCoachMessage(conversationId, msg.role, msg.content);
    }

    console.log(`Migrated ${localMessages.length} messages to Supabase`);
  } catch (error) {
    console.error('Error migrating messages:', error);
  }
}
