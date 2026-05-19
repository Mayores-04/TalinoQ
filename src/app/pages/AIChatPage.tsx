import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  BookOpenCheck,
  History,
  Layers3,
  Paperclip,
  Plus,
  Send,
  X,
} from 'lucide-react-native';
import {
  createEmptyAiChat,
  deleteAiChat,
  fetchAiChatMessages,
  renameAiChat,
  saveAiChatMessage,
  subscribeToAiChats,
  updateAiChatLinks,
  type AiChatRecord,
  type AiChatMessageType,
} from '@/lib/aiChats';
import { askTalinoqMentor } from '@/lib/aiMentor';
import { createLibrary, subscribeToLibraries, type LibraryRecord } from '@/lib/libraries';
import {
  saveLearningMaterialFileRecord,
  updateLearningMaterial,
  type MaterialPreview,
} from '@/lib/learningMaterials';
import {
  extractPickedMaterialText,
  formatFileSize,
  getFileMaterialKind,
  validatePickedMaterial,
  type PickedMaterialFile,
} from '@/lib/materialExtraction';
import { extractPdfTextFromRemote } from '@/lib/pdfExtraction';
import { generateReviewerQuestionsWithAi } from '@/lib/reviewerAi';
import { createReviewer, subscribeToReviewers, type ReviewerRecord } from '@/lib/reviewers';
import {
  buildCalculatedStudyContext,
  formatCalculatedStudyContextForAi,
  shouldAttachStudyContextToAi,
} from '@/lib/studyAnalytics';
import { AttachmentPreview } from '@/components/aiChatComponents/AttachmentPreview';
import { ChatHistoryModal } from '@/components/aiChatComponents/ChatHistoryModal';
import { EmptyState } from '@/components/aiChatComponents/EmptyState';
import { MentorMessage } from '@/components/aiChatComponents/MentorMessage';
import { PromptChips } from '@/components/aiChatComponents/PromptChips';
import { TypingIndicator } from '@/components/aiChatComponents/TypingIndicator';
import { UserMessage } from '@/components/aiChatComponents/UserMessage';
import { emptyDraft, materialActionSuggestions, promptSuggestions } from './aiChat/constants';
import {
  buildConfirmationMessage,
  buildLibraryQuestion,
  buildLocalChatTitle,
  buildMaterialContextPrompt,
  buildQuestionCounts,
  buildSaveMaterialQuestion,
  cleanText,
  createChatMessage,
  findLastMaterial,
  findLibrary,
  getFriendlyAiError,
  getRevisionPrompt,
  getRevisionStep,
  getStepLabel,
  getStepOptions,
  isConfirmation,
  isCreateReviewerIntent,
  isNoLibraryChoice,
  isMaterialQuestion,
  normalize,
  parseContentSource,
  parseDifficulty,
  parseReviewerFormat,
  savedMessageToChatMessage,
  stripFileExtension,
} from './aiChat/helpers';
import { styles } from './aiChat/styles';
import type {
  AIChatPageProps,
  ChatMessage,
  CreationStep,
  DraftReviewer,
  MentorMode,
} from './aiChat/types';

export function AIChatPage({
  onBack,
  onOpenReviewers,
  onOpenHome: _onOpenHome,
  onOpenCreate: _onOpenCreate,
  onOpenProgress: _onOpenProgress,
}: AIChatPageProps) {
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView | null>(null);
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [libraries, setLibraries] = useState<LibraryRecord[]>([]);
  const [savedReviewers, setSavedReviewers] = useState<ReviewerRecord[]>([]);
  const [mode, setMode] = useState<MentorMode>('normal_chat');
  const [step, setStep] = useState<CreationStep>('select_library');
  const [draft, setDraft] = useState<DraftReviewer>(emptyDraft);
  const [createdReviewer, setCreatedReviewer] = useState<ReviewerRecord | null>(null);
  const [activeMaterial, setActiveMaterial] = useState<MaterialPreview | null>(null);
  const [isUploadingMaterial, setIsUploadingMaterial] = useState(false);
  const [chats, setChats] = useState<AiChatRecord[]>([]);
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const [currentChatTitle, setCurrentChatTitle] = useState('New Chat');
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [draftChatStarted, setDraftChatStarted] = useState(false);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [draftTitle, setDraftTitle] = useState('');

  const trimmedMessage = message.trim();
  const canSend =
    trimmedMessage.length > 0 && !isSending && !isUploadingMaterial && step !== 'saving';
  const activeOptions = useMemo(
    () => getStepOptions({ activeMaterial, libraries, mode, step }),
    [activeMaterial, libraries, mode, step]
  );
  const calculatedContext = useMemo(
    () => buildCalculatedStudyContext(savedReviewers),
    [savedReviewers]
  );
  const hasConversation = messages.length > 0;

  useEffect(() => subscribeToLibraries(setLibraries), []);
  useEffect(() => subscribeToReviewers(setSavedReviewers), []);

  useEffect(
    () =>
      subscribeToAiChats((nextChats) => {
        setChats(nextChats);
        setHistoryError(null);
      }, setHistoryError),
    []
  );

  useEffect(() => {
    if (currentChatId || draftChatStarted || messages.length > 0 || chats.length === 0) {
      return;
    }

    void loadChat(chats[0]);
  }, [chats, currentChatId, draftChatStarted, messages.length]);

  useEffect(() => {
    const chat = chats.find((item) => item.id === currentChatId);

    if (chat) {
      setCurrentChatTitle(chat.title);
    }
  }, [chats, currentChatId]);

  async function loadChat(chat: AiChatRecord) {
    setMessagesLoading(true);
    setErrorMessage(null);

    try {
      const savedMessages = await fetchAiChatMessages(chat.id);
      setMessages(savedMessages.map(savedMessageToChatMessage));
      setCurrentChatId(chat.id);
      setCurrentChatTitle(chat.title);
      setDraftChatStarted(false);
      setHistoryOpen(false);
      setMode('normal_chat');
      setStep('select_library');
      setActiveMaterial(findLastMaterial(savedMessages));
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to load this chat.');
    } finally {
      setMessagesLoading(false);
    }
  }

  function startNewChat() {
    if (!currentChatId && messages.length === 0) {
      setHistoryOpen(false);
      return;
    }

    setCurrentChatId(null);
    setCurrentChatTitle('New Chat');
    setMessages([]);
    setMode('normal_chat');
    setStep('select_library');
    setDraft(emptyDraft);
    setCreatedReviewer(null);
    setActiveMaterial(null);
    setErrorMessage(null);
    setDraftChatStarted(true);
    setHistoryOpen(false);
  }

  async function removeChat(chat: AiChatRecord) {
    Alert.alert('Delete chat?', `${chat.title} will be removed from your AI history.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          setHistoryError(null);

          try {
            await deleteAiChat(chat.id);

            if (currentChatId === chat.id) {
              startNewChat();
            }
          } catch (error) {
            setHistoryError(error instanceof Error ? error.message : 'Failed to delete chat.');
          }
        },
      },
    ]);
  }

  function beginTitleEdit() {
    setDraftTitle(currentChatTitle || 'New Chat');
    setIsEditingTitle(true);
  }

  function cancelTitleEdit() {
    setIsEditingTitle(false);
    setDraftTitle('');
  }

  async function saveTitleEdit() {
    const nextTitle = draftTitle.trim();

    if (!nextTitle) {
      cancelTitleEdit();
      return;
    }

    let chatId = currentChatId;

    try {
      if (!chatId) {
        chatId = await createEmptyAiChat();
        setCurrentChatId(chatId);
        setDraftChatStarted(false);
      }

      await renameAiChat(chatId, nextTitle);
      setCurrentChatTitle(nextTitle);
      setChats((current) =>
        current.map((chat) => (chat.id === chatId ? { ...chat, title: nextTitle } : chat))
      );
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to rename chat.');
    } finally {
      cancelTitleEdit();
    }
  }

  async function renameChat(chatId: string, title: string) {
    const nextTitle = title.trim();

    if (!nextTitle) {
      setHistoryError('Chat title cannot be empty.');
      return;
    }

    setHistoryError(null);

    try {
      await renameAiChat(chatId, nextTitle);
      setChats((current) =>
        current.map((chat) => (chat.id === chatId ? { ...chat, title: nextTitle } : chat))
      );
      if (currentChatId === chatId) {
        setCurrentChatTitle(nextTitle);
      }
    } catch (error) {
      setHistoryError(error instanceof Error ? error.message : 'Failed to rename chat.');
    }
  }

  function appendLocalMessage(chatMessage: ChatMessage) {
    setMessages((current) => [...current, chatMessage]);
  }

  async function persistMessage(
    chatMessage: ChatMessage,
    type: AiChatMessageType = chatMessage.attachment ? 'file' : 'text',
    targetChatId = currentChatId
  ) {
    try {
      const saved = await saveAiChatMessage({
        attachment: chatMessage.attachment,
        chatId: targetChatId,
        content: chatMessage.content,
        mode,
        role: chatMessage.role,
        type,
      });

      if (!currentChatId) {
        setCurrentChatId(saved.chatId);
        if (chatMessage.role === 'user') {
          setCurrentChatTitle(buildLocalChatTitle(chatMessage.content));
        }
      }

      setDraftChatStarted(false);
      return saved.chatId;
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to save chat message.');
      return targetChatId;
    }
  }

  async function pushAssistant(
    content: string,
    tone?: ChatMessage['tone'],
    type: AiChatMessageType = tone === 'warning' ? 'error' : 'text',
    targetChatId = currentChatId
  ) {
    const assistantMessage = createChatMessage('assistant', content, tone);
    appendLocalMessage(assistantMessage);
    return persistMessage(assistantMessage, type, targetChatId);
  }

  async function pushUser(content: string, type: AiChatMessageType = 'text') {
    const userMessage = createChatMessage('user', content);
    appendLocalMessage(userMessage);
    return persistMessage(userMessage, type);
  }

  async function pushUserAttachment(content: string, attachment: MaterialPreview) {
    const userMessage = createChatMessage('user', content, undefined, attachment);
    appendLocalMessage(userMessage);
    return persistMessage(userMessage, 'file');
  }

  async function startReviewerFlow() {
    setMode('creating_reviewer');
    setStep('select_library');
    setDraft(emptyDraft);
    setCreatedReviewer(null);
    setErrorMessage(null);
    const chatId = await pushUser('Create a reviewer', 'suggestion');
    await pushAssistant(
      buildLibraryQuestion(libraries),
      libraries.length > 0 ? undefined : 'warning',
      'reviewer_flow',
      chatId
    );
  }

  function cancelReviewerFlow() {
    setMode('normal_chat');
    setStep('select_library');
    setDraft(emptyDraft);
    setCreatedReviewer(null);
    void pushAssistant('Current AI flow cancelled. You can start again whenever you are ready.');
  }

  async function sendMessage() {
    if (!canSend) {
      return;
    }

    const text = trimmedMessage;
    setMessage('');
    setErrorMessage(null);

    // If there's an attached material preview, send it with the message when user presses send.
    const sendingAttachment = activeMaterial;
    let activeChatId: string | null = currentChatId;

    if (sendingAttachment) {
      // send user message with attachment
      activeChatId = await pushUserAttachment(
        text || 'Attached a learning material',
        sendingAttachment
      );
      // clear preview after enqueuing
      setActiveMaterial(null);
    } else {
      activeChatId = await pushUser(text);
    }

    if (mode === 'creating_reviewer') {
      await processReviewerReply(text, activeChatId);
      return;
    }

    if (mode === 'saving_material') {
      await processMaterialSaveReply(text, activeChatId);
      return;
    }

    if (isCreateReviewerIntent(text)) {
      setMode('creating_reviewer');
      setStep('select_library');
      setDraft(emptyDraft);
      await pushAssistant(
        buildLibraryQuestion(libraries),
        libraries.length > 0 ? undefined : 'warning',
        'reviewer_flow',
        activeChatId
      );
      return;
    }

    if (sendingAttachment && isMaterialQuestion(text)) {
      await answerWithMaterialContext(text, activeChatId);
      return;
    }

    setIsSending(true);
    try {
      const aiUserPrompt = buildCalculationFirstMentorPrompt(text);
      const response = await askTalinoqMentor([
        ...messages.map(({ role, content }) => ({ role, content })),
        { role: 'user', content: aiUserPrompt },
      ]);
      await pushAssistant(response.message, undefined, 'text', activeChatId);
    } catch (error) {
      setErrorMessage(getFriendlyAiError(error));
    } finally {
      setIsSending(false);
    }
  }

  async function processReviewerReply(text: string, activeChatId = currentChatId) {
    const normalized = normalize(text);

    if (normalized === 'cancel') {
      cancelReviewerFlow();
      return;
    }

    if (step === 'confirm' && normalized.startsWith('revise')) {
      const targetStep = getRevisionStep(normalized);
      setStep(targetStep);
      await pushAssistant(
        getRevisionPrompt(targetStep, libraries),
        undefined,
        'reviewer_flow',
        activeChatId
      );
      return;
    }

    if (step === 'select_library') {
      const library = findLibrary(text, libraries);
      const subject =
        library?.name ??
        (isNoLibraryChoice(text) ? 'General Study' : cleanText(text, 'General Study'));
      setDraft((current) => ({
        ...current,
        libraryId: library?.id ?? null,
        libraryName: library?.name ?? null,
        subject,
      }));
      setStep('title');
      await pushAssistant(
        'What is the title of your reviewer?',
        undefined,
        'reviewer_flow',
        activeChatId
      );
      return;
    }

    if (step === 'title') {
      const title = cleanText(text, '');
      if (title.length < 3) {
        await pushAssistant(
          'Please give the reviewer title at least 3 characters.',
          'warning',
          'reviewer_flow',
          activeChatId
        );
        return;
      }

      setDraft((current) => ({ ...current, title }));
      setStep('topic');
      await pushAssistant(
        'What topic or lesson should this reviewer cover?',
        undefined,
        'reviewer_flow',
        activeChatId
      );
      return;
    }

    if (step === 'topic') {
      const topic = cleanText(text, '');
      if (topic.length < 2) {
        await pushAssistant(
          'Please tell me the topic or lesson so the reviewer has a clear focus.',
          'warning',
          'reviewer_flow',
          activeChatId
        );
        return;
      }

      setDraft((current) => ({ ...current, topic }));
      setStep('content_source');
      await pushAssistant(
        'Do you want to paste notes, upload scanned text, type the content manually, or create from the topic only?',
        undefined,
        'reviewer_flow',
        activeChatId
      );
      return;
    }

    if (step === 'content_source') {
      const source = parseContentSource(text);
      setDraft((current) => ({ ...current, contentSource: source }));

      if (source === 'topic only') {
        setStep('format');
        await pushAssistant(
          'Got it. I can create a basic reviewer from the topic. Adding notes later will make it more accurate. What reviewer format do you want?',
          undefined,
          'reviewer_flow',
          activeChatId
        );
        return;
      }

      setStep('content');
      await pushAssistant(
        'Paste or type the content you want me to use. If you want to skip notes, type "skip".',
        undefined,
        'reviewer_flow',
        activeChatId
      );
      return;
    }

    if (step === 'content') {
      const sourceContent = normalized === 'skip' ? '' : text.trim();
      setDraft((current) => ({ ...current, sourceContent }));
      setStep('format');
      await pushAssistant(
        'What reviewer format do you want?',
        undefined,
        'reviewer_flow',
        activeChatId
      );
      return;
    }

    if (step === 'format') {
      const format = parseReviewerFormat(text);
      setDraft((current) => ({ ...current, format }));
      setStep('difficulty');
      await pushAssistant(
        'What difficulty level should I use?',
        undefined,
        'reviewer_flow',
        activeChatId
      );
      return;
    }

    if (step === 'difficulty') {
      const difficulty = parseDifficulty(text);
      const nextDraft = { ...draft, difficulty };
      setDraft(nextDraft);
      setStep('confirm');
      await pushAssistant(
        buildConfirmationMessage(nextDraft),
        undefined,
        'reviewer_flow',
        activeChatId
      );
      return;
    }

    if (step === 'confirm') {
      if (!isConfirmation(text)) {
        await pushAssistant(
          'Type "create" to save it, "cancel" to stop, or "revise title/topic/library/format/difficulty/content" to change something.',
          'warning',
          'reviewer_flow',
          activeChatId
        );
        return;
      }

      await saveAiReviewer(activeChatId);
    }
  }

  async function saveAiReviewer(activeChatId = currentChatId) {
    if (step === 'saving') {
      return;
    }

    setStep('saving');
    setIsSending(true);
    setErrorMessage(null);

    try {
      const format = draft.format ?? 'mixed';
      const difficulty = draft.difficulty ?? 'Medium';
      const subject = draft.subject || draft.libraryName || 'General Study';
      const questionCounts = buildQuestionCounts(format);
      const estimatedItems = questionCounts.reduce((total, item) => total + item.count, 0);
      const materialIds = activeMaterial ? [activeMaterial.id] : [];
      const generatedQuestions = await generateReviewerQuestionsWithAi({
        title: draft.title,
        subject,
        category: draft.libraryName ?? draft.topic,
        difficulty,
        questionCounts,
        libraryId: draft.libraryId,
        libraryName: draft.libraryName,
        sourceMaterialIds: materialIds,
        sourceContent: draft.sourceContent || draft.topic,
        exportSettings: {
          format: 'PDF',
          includeAnswers: true,
          includeExplanations: true,
          includeHeader: true,
          theme: 'Modern Academic',
        },
        estimatedItems,
        calculatedContext,
      });
      const reviewer = await createReviewer({
        title: draft.title,
        subject,
        category: draft.libraryName ?? draft.topic,
        difficulty,
        questionCounts,
        libraryId: draft.libraryId,
        libraryName: draft.libraryName,
        sourceMaterialIds: materialIds,
        generatedQuestions,
        exportSettings: {
          format: 'PDF',
          includeAnswers: true,
          includeExplanations: true,
          includeHeader: true,
          theme: 'Modern Academic',
        },
      });

      setCreatedReviewer(reviewer);
      setMode('normal_chat');
      setStep('completed');
      if (activeChatId) {
        await updateAiChatLinks(activeChatId, {
          linkedMaterialId: activeMaterial?.id ?? null,
          linkedReviewerId: reviewer.id,
          linkedSubjectId: reviewer.libraryId ?? null,
          mode: 'normal_chat',
        });
      }

      await pushAssistant(
        `Reviewer created successfully.\n\n${reviewer.title} is saved${reviewer.libraryName ? ` in ${reviewer.libraryName}` : ''} and will appear on your Reviewers page.`,
        'success',
        'reviewer_flow',
        activeChatId
      );
    } catch (error) {
      setStep('confirm');
      setErrorMessage(getFriendlyAiError(error));
      await pushAssistant(
        'I could not save that reviewer yet. You can retry by typing "create".',
        'warning',
        'reviewer_flow',
        activeChatId
      );
    } finally {
      setIsSending(false);
    }
  }

  async function pickMaterialFile() {
    if (isUploadingMaterial || isSending) {
      return;
    }

    setErrorMessage(null);

    try {
      const result = await DocumentPicker.getDocumentAsync({
        copyToCacheDirectory: true,
        multiple: false,
        type: [
          'application/pdf',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'image/jpeg',
          'image/jpg',
          'image/png',
          'image/heic',
          'image/heif',
        ],
      });

      if (result.canceled) {
        return;
      }

      const asset = result.assets[0];
      const pickedFile: PickedMaterialFile = {
        uri: asset.uri,
        name: asset.name ?? `material-${Date.now()}`,
        mimeType: asset.mimeType,
        size: asset.size,
      };
      const sourceType = validatePickedMaterial(pickedFile);
      const optimisticMaterial: MaterialPreview = {
        id: `upload-${Date.now()}`,
        kind: getFileMaterialKind(sourceType),
        title: pickedFile.name,
        subtitle: `${sourceType.toUpperCase()} - ${formatFileSize(pickedFile.size)}`,
        status: 'Uploading',
        fileName: pickedFile.name,
        fileSize: pickedFile.size,
        mimeType: pickedFile.mimeType,
        sourceType,
        uri: pickedFile.uri,
      };

      const activeChatId = await pushUserAttachment(
        'Attached a learning material',
        optimisticMaterial
      );
      setActiveMaterial(optimisticMaterial);
      setIsUploadingMaterial(true);
      await pushAssistant('Uploading file...', undefined, 'file', activeChatId);

      const extraction = await extractPickedMaterialText(pickedFile);
      await pushAssistant('Reading your material...', undefined, 'file', activeChatId);
      const savedMaterial = await saveLearningMaterialFileRecord({
        kind: getFileMaterialKind(extraction.sourceType),
        title: pickedFile.name,
        fileName: pickedFile.name,
        localUri: pickedFile.uri,
        contentType: pickedFile.mimeType,
        fileSize: pickedFile.size,
        extractedText: extraction.extractedText,
      });
      const remoteExtraction =
        extraction.sourceType === 'pdf' && !extraction.extractedText
          ? await extractPdfTextFromRemote(savedMaterial.remoteUrl)
          : null;
      const extractedText = remoteExtraction?.text || extraction.extractedText;
      const extractionMessage =
        remoteExtraction?.text
          ? 'I extracted readable text from this PDF.'
          : remoteExtraction?.warning || extraction.extractionMessage;

      if (remoteExtraction) {
        await updateLearningMaterial(savedMaterial.id, {
          extractedText,
          status: extractedText ? 'Ready' : 'Saved',
        });
      }

      const readyMaterial: MaterialPreview = {
        ...optimisticMaterial,
        id: savedMaterial.id,
        status: extractedText ? 'Ready' : (savedMaterial.status ?? 'Saved'),
        remoteUrl: savedMaterial.remoteUrl,
        fileUrl: savedMaterial.fileUrl ?? savedMaterial.remoteUrl,
        previewUri: savedMaterial.remoteUrl,
        extractedText,
        subtitle: `${extraction.sourceType.toUpperCase()} - ${formatFileSize(
          savedMaterial.fileSize ?? pickedFile.size
        )}`,
      };

      setActiveMaterial(readyMaterial);
      replaceAttachment(optimisticMaterial.id, readyMaterial);
      if (activeChatId) {
        await updateAiChatLinks(activeChatId, {
          linkedMaterialId: readyMaterial.id,
          linkedSubjectId: readyMaterial.libraryId ?? null,
        });
      }

      await pushAssistant(
        `I received your file: ${pickedFile.name}.\n\n${extractionMessage}\n\nWhat would you like me to do with it?`,
        extractedText ? 'success' : 'warning',
        'file',
        activeChatId
      );
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'File upload failed.');
      void pushAssistant(
        'I could not upload that file. Please try again with a supported file.',
        'warning'
      );
    } finally {
      setIsUploadingMaterial(false);
    }
  }

  function replaceAttachment(tempId: string, material: MaterialPreview) {
    setMessages((current) =>
      current.map((item) =>
        item.attachment?.id === tempId
          ? {
              ...item,
              attachment: material,
            }
          : item
      )
    );
  }

  async function answerWithMaterialContext(userText: string, activeChatId = currentChatId) {
    if (!activeMaterial) {
      return;
    }

    if (!activeMaterial.extractedText) {
      await pushAssistant(
        'I can see the uploaded file metadata, but I do not have readable text from it yet. Paste the important text here and I can summarize, explain, quiz, or turn it into a reviewer.',
        'warning',
        'file',
        activeChatId
      );
      return;
    }

    setIsSending(true);
    try {
      const response = await askTalinoqMentor([
        {
          role: 'user',
          content: [
            formatCalculatedStudyContextForAi(calculatedContext, userText),
            buildMaterialContextPrompt(activeMaterial, userText),
          ].join('\n\n'),
        },
      ]);
      await pushAssistant(response.message, undefined, 'text', activeChatId);
    } catch (error) {
      setErrorMessage(getFriendlyAiError(error));
    } finally {
      setIsSending(false);
    }
  }

  async function processMaterialSaveReply(text: string, activeChatId = currentChatId) {
    if (!activeMaterial) {
      setMode('normal_chat');
      await pushAssistant(
        'There is no active material to save. Attach a file first.',
        'warning',
        'file',
        activeChatId
      );
      return;
    }

    if (normalize(text) === 'cancel') {
      setMode('normal_chat');
      await pushAssistant('Material save cancelled.', undefined, 'file', activeChatId);
      return;
    }

    setIsSending(true);
    setErrorMessage(null);

    try {
      const existingLibrary = findLibrary(text, libraries);
      const library =
        existingLibrary ??
        (await createLibrary({
          name: cleanText(text, 'New Subject'),
          description: 'Created from TalinoQ AI chat',
          color: '#004f4c',
        }));

      await updateLearningMaterial(activeMaterial.id, {
        libraryId: library.id,
        libraryName: library.name,
        status: activeMaterial.extractedText ? 'Ready' : 'Saved',
      });

      const updatedMaterial = {
        ...activeMaterial,
        libraryId: library.id,
        libraryName: library.name,
        status: activeMaterial.extractedText ? 'Ready' : 'Saved',
      } satisfies MaterialPreview;

      setActiveMaterial(updatedMaterial);
      replaceAttachment(activeMaterial.id, updatedMaterial);
      setMode('normal_chat');
      if (activeChatId) {
        await updateAiChatLinks(activeChatId, {
          linkedMaterialId: activeMaterial.id,
          linkedSubjectId: library.id,
          mode: 'normal_chat',
        });
      }
      await pushAssistant(
        `Saved successfully to ${library.name}.`,
        'success',
        'file',
        activeChatId
      );
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Material save failed.');
      await pushAssistant(
        'I could not save that material to a subject yet. Please try again.',
        'warning',
        'file',
        activeChatId
      );
    } finally {
      setIsSending(false);
    }
  }

  async function handleMaterialAction(action: string, activeChatId = currentChatId) {
    if (!activeMaterial) {
      await pushAssistant(
        'Attach a learning material first, then I can help with it.',
        'warning',
        'file',
        activeChatId
      );
      return;
    }

    if (action === 'Save to subject') {
      setMode('saving_material');
      await pushAssistant(buildSaveMaterialQuestion(libraries), undefined, 'file', activeChatId);
      return;
    }

    if (action === 'Create reviewer' || action === 'Make flashcards') {
      const format = action === 'Make flashcards' ? 'flashcards' : null;
      setMode('creating_reviewer');
      setDraft({
        ...emptyDraft,
        libraryId: activeMaterial.libraryId ?? null,
        libraryName: activeMaterial.libraryName ?? null,
        subject: activeMaterial.libraryName ?? 'General Study',
        title: `${stripFileExtension(activeMaterial.fileName ?? activeMaterial.title)} Reviewer`,
        topic: stripFileExtension(activeMaterial.fileName ?? activeMaterial.title),
        contentSource: 'paste notes',
        sourceContent: activeMaterial.extractedText ?? '',
        format,
      });

      if (activeMaterial.extractedText) {
        setStep(format ? 'difficulty' : 'format');
        await pushAssistant(
          format ? 'What difficulty level should I use?' : 'What reviewer format do you want?',
          undefined,
          'reviewer_flow',
          activeChatId
        );
        return;
      }

      setStep('content');
      await pushAssistant(
        'I can create a reviewer from this file after I have readable text. Paste the file text here, or type "skip" to create a basic reviewer from the file name.',
        'warning',
        'reviewer_flow',
        activeChatId
      );
      return;
    }

    await answerWithMaterialContext(action, activeChatId);
  }

  function handleSuggestion(prompt: string) {
    if (isSending) {
      return;
    }

    if (activeMaterial && materialActionSuggestions.includes(prompt)) {
      void (async () => {
        const activeChatId = await pushUser(prompt, 'suggestion');
        await handleMaterialAction(prompt, activeChatId);
      })();
      return;
    }

    if (prompt === 'Create a reviewer') {
      void startReviewerFlow();
      return;
    }

    setMessage(prompt);
  }

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
        style={styles.keyboardArea}>
        <View style={styles.header}>
          <TouchableOpacity
            activeOpacity={0.76}
            accessibilityRole="button"
            accessibilityLabel="Back"
            onPress={onBack}
            style={styles.headerButton}>
            <ArrowLeft size={22} color="#004f4c" />
          </TouchableOpacity>

          <View style={styles.headerIdentity}>
            <Image
              source={require('../../../assets/LightModeAppLogo.png')}
              resizeMode="contain"
              style={styles.headerAvatar}
            />
            <View style={styles.headerCopy}>
              {isEditingTitle ? (
                <TextInput
                  value={draftTitle}
                  onChangeText={setDraftTitle}
                  placeholder="Chat title"
                  placeholderTextColor="#94a3b8"
                  returnKeyType="done"
                  onSubmitEditing={saveTitleEdit}
                  onBlur={saveTitleEdit}
                  style={styles.headerTitleInput}
                />
              ) : (
                <TouchableOpacity
                  accessibilityRole="button"
                  accessibilityLabel="Edit chat title"
                  onPress={beginTitleEdit}>
                  <Text style={styles.headerTitle} numberOfLines={1}>
                    {currentChatTitle || 'TalinoQ AI Mentor'}
                  </Text>
                </TouchableOpacity>
              )}
              <View style={styles.statusRow}>
                <View style={styles.statusDot} />
                <Text style={styles.headerSubtitle}>Scan. Review. Improve.</Text>
              </View>
            </View>
          </View>

          <View style={styles.headerActions}>
            <TouchableOpacity
              activeOpacity={0.76}
              accessibilityRole="button"
              accessibilityLabel="New chat"
              onPress={startNewChat}
              style={styles.headerMiniButton}>
              <Plus size={18} color="#004f4c" />
            </TouchableOpacity>
            <TouchableOpacity
              activeOpacity={0.76}
              accessibilityRole="button"
              accessibilityLabel="Chat history"
              onPress={() => setHistoryOpen(true)}
              style={styles.headerMiniButton}>
              <History size={18} color="#004f4c" />
            </TouchableOpacity>
          </View>

          {mode === 'creating_reviewer' || mode === 'saving_material' ? (
            <TouchableOpacity
              activeOpacity={0.76}
              accessibilityRole="button"
              accessibilityLabel="Cancel active AI flow"
              onPress={cancelReviewerFlow}
              style={styles.headerButton}>
              <X size={20} color="#004f4c" />
            </TouchableOpacity>
          ) : null}
        </View>

        {mode === 'creating_reviewer' ? (
          <View style={styles.flowBar}>
            <View style={styles.flowIcon}>
              <BookOpenCheck size={15} color="#004f4c" />
            </View>
            <View style={styles.flowCopy}>
              <Text style={styles.flowTitle}>Creating reviewer</Text>
              <Text style={styles.flowText}>{getStepLabel(step)}</Text>
            </View>
          </View>
        ) : null}

        <ScrollView
          ref={scrollRef}
          contentContainerStyle={[
            styles.chatContent,
            { paddingBottom: Math.max(180, insets.bottom + 156) },
          ]}
          keyboardShouldPersistTaps="handled"
          onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
          showsVerticalScrollIndicator={false}>
          {messagesLoading ? (
            <View style={styles.loadingHistoryCard}>
              <ActivityIndicator color="#004f4c" />
              <Text style={styles.loadingHistoryText}>Loading saved chat...</Text>
            </View>
          ) : null}

          {!hasConversation ? (
            <EmptyState onSuggestion={handleSuggestion} prompts={promptSuggestions} />
          ) : null}

          {messages.map((chatMessage) =>
            chatMessage.role === 'assistant' ? (
              <MentorMessage
                key={chatMessage.id}
                text={chatMessage.content}
                time={chatMessage.time}
                tone={chatMessage.tone}
              />
            ) : (
              <UserMessage
                key={chatMessage.id}
                attachment={chatMessage.attachment}
                text={chatMessage.content}
                time={chatMessage.time}
              />
            )
          )}

          {isSending ? <TypingIndicator /> : null}
        </ScrollView>

        <View style={[styles.composerWrap, { paddingBottom: Math.max(12, insets.bottom + 10) }]}>
          {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}

          {hasConversation ? (
            <PromptChips prompts={activeOptions} onPress={handleStepChip} />
          ) : null}

          {createdReviewer ? (
            <TouchableOpacity
              activeOpacity={0.84}
              onPress={onOpenReviewers}
              style={styles.reviewersCta}>
              <Layers3 size={15} color="#004f4c" />
              <Text style={styles.reviewersCtaText}>Open Reviewers</Text>
            </TouchableOpacity>
          ) : null}

          {activeMaterial ? (
            <AttachmentPreview material={activeMaterial} onRemove={() => setActiveMaterial(null)} />
          ) : null}

          <View style={styles.composerRow}>
            <TouchableOpacity
              activeOpacity={0.82}
              accessibilityRole="button"
              accessibilityLabel="Attach learning material"
              disabled={isUploadingMaterial || isSending}
              onPress={pickMaterialFile}
              style={[
                styles.attachButton,
                (isUploadingMaterial || isSending) && styles.attachButtonDisabled,
              ]}>
              {isUploadingMaterial ? (
                <ActivityIndicator color="#004f4c" size="small" />
              ) : (
                <Paperclip size={20} color="#004f4c" />
              )}
            </TouchableOpacity>

            <TextInput
              value={message}
              onChangeText={setMessage}
              placeholder="Ask TalinoQ AI to explain, quiz, or create a reviewer..."
              placeholderTextColor="#8da0b3"
              multiline
              maxLength={4000}
              returnKeyType="send"
              style={styles.composer}
              textAlignVertical="center"
            />

            <TouchableOpacity
              activeOpacity={0.86}
              accessibilityRole="button"
              accessibilityLabel="Send message"
              disabled={!canSend}
              onPress={sendMessage}
              style={[styles.sendButton, !canSend && styles.sendButtonDisabled]}>
              {isSending ? (
                <ActivityIndicator color="#ffffff" size="small" />
              ) : (
                <Send size={21} color="#ffffff" fill="#ffffff" />
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>

      <ChatHistoryModal
        chats={chats}
        currentChatId={currentChatId}
        errorMessage={historyError}
        onClose={() => setHistoryOpen(false)}
        onDelete={removeChat}
        onNewChat={startNewChat}
        onRename={renameChat}
        onSelect={loadChat}
        visible={historyOpen}
      />
    </SafeAreaView>
  );

  function handleStepChip(value: string) {
    if (mode === 'normal_chat') {
      handleSuggestion(value);
      return;
    }

    setMessage(value);
  }

  function buildCalculationFirstMentorPrompt(userText: string) {
    if (!shouldAttachStudyContextToAi(userText)) {
      return userText;
    }

    return [
      'You are TalinoQ AI. Follow calculation-first guidance.',
      formatCalculatedStudyContextForAi(calculatedContext, userText),
      `User request: ${userText}`,
    ].join('\n\n');
  }
}
