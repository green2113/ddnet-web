export type Language = 'ko' | 'en' | 'zh-Hans' | 'zh-Hant'

type TranslationMap = Record<Language, UiText>

export type UiText = {
  locale: string
  app: {
    loginTitle: string
    loginSubtitle: string
    loginWithout: string
    loginDiscord: string
    guestTitle: string
    guestPlaceholder: string
    back: string
    confirm: string
    copyMessage: string
    deleteMessage: string
    someone: string
  }
  header: {
    channelListAria: string
    channel: string
    members: string
    light: string
    dark: string
    lightTheme: string
    darkTheme: string
    guestSuffix: string
    logout: string
    loginDiscord: string
  }
  composer: {
    placeholderLogin: string
    placeholderMessage: string
    send: string
  }
  messageList: {
    loadError: string
    retry: string
    loading: string
    empty: string
    adminTag: string
  }
  sidebarChannels: {
    serverName: string
    serverSettings: string
    notifications: string
    textChannels: string
    voiceChannels: string
    showHidden: string
    hideHidden: string
    hidden: string
    channelNamePrompt: string
    channelName: string
    channelShow: string
    channelHide: string
    channelDelete: string
    addTextChannel: string
    addVoiceChannel: string
  }
  sidebarGuilds: {
    add: string
  }
  serverSettings: {
    title: string
    serverProfile: string
    manage: string
    admins: string
    adminTitle: string
    adminSubtitle: string
    adminAdd: string
    adminList: string
    adminPlaceholder: string
    adminRemove: string
    submit: string
    close: string
  }
  voice: {
    title: string
    membersCount: string
    leave: string
    join: string
    micOn: string
    micOff: string
    headsetOn: string
    headsetOff: string
    micMuted: string
    headsetMuted: string
  }
  userSettings: {
    account: string
    voiceVideo: string
    language: string
    titleAccount: string
    titleVoice: string
    titleLanguage: string
    subtitleAccount: string
    subtitleVoice: string
    subtitleLanguage: string
    nickname: string
    profileHint: string
    guestMode: string
    online: string
    micSensitivity: string
    currentInput: string
    detectThreshold: string
    detected: string
    quiet: string
    sensitivityHint: string
    noiseSuppression: string
    noiseSuppressionHint: string
    noiseSuppressionOptions: {
      webrtc: string
      off: string
    }
    rejoinHint: string
    on: string
    off: string
    inputTest: string
    inputTestHint: string
    startTest: string
    stopTest: string
    testingHint: string
    micPermission: string
    close: string
    open: string
    guest: string
    guestAccount: string
    myAccount: string
    languageOptions: {
      ko: string
      en: string
      'zh-Hans': string
      'zh-Hant': string
    }
  }
  login: {
    redirecting: string
    fallback: string
    clickHere: string
    pleaseDo: string
  }
}

const translations: TranslationMap = {
  en: {
    locale: 'en-US',
    app: {
      loginTitle: 'What would you like to log in with?',
      loginSubtitle: 'You can use chat and voice calls without logging in. You can switch to Discord login later.',
      loginWithout: 'Without login',
      loginDiscord: 'Login to Discord',
      guestTitle: 'Enter the name you wish to use.',
      guestPlaceholder: 'ex. guest',
      back: 'Back',
      confirm: 'Confirm',
      copyMessage: 'Copy message',
      deleteMessage: 'Delete message',
      someone: 'Someone',
    },
    header: {
      channelListAria: 'Channel list',
      channel: 'Channel',
      members: 'Members',
      light: 'Light',
      dark: 'Dark',
      lightTheme: 'Light theme',
      darkTheme: 'Dark theme',
      guestSuffix: ' (Guest)',
      logout: 'Logout',
      loginDiscord: 'Login with Discord',
    },
    composer: {
      placeholderLogin: 'Please log in.',
      placeholderMessage: 'Send a message',
      send: 'Send',
    },
    messageList: {
      loadError: 'Failed to load messages.',
      retry: 'Try again',
      loading: 'Loading messages…',
      empty: 'No messages yet. Send the first one!',
      adminTag: '👑 Admin',
    },
    sidebarChannels: {
      serverName: 'DDNet Server',
      serverSettings: 'Server settings',
      notifications: 'Notification settings',
      textChannels: 'Text channels',
      voiceChannels: 'Voice channels',
      showHidden: 'Show hidden channels ({count})',
      hideHidden: 'Hide hidden channels',
      hidden: 'Hidden',
      channelNamePrompt: 'Enter a channel name',
      channelName: 'Channel name',
      channelShow: 'Show channel',
      channelHide: 'Hide channel',
      channelDelete: 'Delete channel',
      addTextChannel: 'Add text channel',
      addVoiceChannel: 'Add voice channel',
    },
    sidebarGuilds: {
      add: 'Add',
    },
    serverSettings: {
      title: 'DD Server',
      serverProfile: 'Server profile',
      manage: 'Manage',
      admins: 'Admins',
      adminTitle: 'Admins',
      adminSubtitle: 'Add or remove admin IDs.',
      adminAdd: 'Add admin',
      adminList: 'Admin list',
      adminPlaceholder: 'Discord user ID',
      adminRemove: 'Remove admin',
      submit: 'Submit',
      close: 'Close settings',
    },
    voice: {
      title: 'Voice channel',
      membersCount: '{count} members in the channel',
      leave: 'Leave',
      join: 'Join',
      micOn: 'Unmute mic',
      micOff: 'Mute mic',
      headsetOn: 'Unmute headset',
      headsetOff: 'Mute headset',
      micMuted: 'Mic muted',
      headsetMuted: 'Headset muted',
    },
    userSettings: {
      account: 'My Account',
      voiceVideo: 'Voice & Video',
      language: 'Language',
      titleAccount: 'My Account',
      titleVoice: 'Voice Settings',
      titleLanguage: 'Language Settings',
      subtitleAccount: 'Check your profile and account information.',
      subtitleVoice: 'Adjust mic sensitivity and voice input.',
      subtitleLanguage: 'Choose the language to display.',
      nickname: 'Nickname',
      profileHint: 'You can review your profile photo and info in settings.',
      guestMode: 'Guest mode',
      online: 'Online',
      micSensitivity: 'Mic Sensitivity',
      currentInput: 'Current input',
      detectThreshold: 'Detection threshold',
      detected: 'Detected',
      quiet: 'Quiet',
      sensitivityHint: 'Higher values let the mic react to smaller sounds.',
      noiseSuppression: 'Noise Suppression',
      noiseSuppressionHint: 'Use WebRTC noise suppression to reduce background noise.',
      noiseSuppressionOptions: {
        webrtc: 'Default',
        off: 'None',
      },
      rejoinHint: 'Rejoin the voice channel after changing this setting.',
      on: 'On',
      off: 'Off',
      inputTest: 'Input Test',
      inputTestHint: 'Use this to test your mic settings.',
      startTest: 'Start Test',
      stopTest: 'Stop Test',
      testingHint: 'Mic test is running. Try speaking.',
      micPermission: 'Microphone access is required.',
      close: 'Close user settings',
      open: 'Open user settings',
      guest: 'Guest',
      guestAccount: 'Guest account',
      myAccount: 'My account',
      languageOptions: {
        ko: '한국어',
        en: 'English',
        'zh-Hans': '中文(简体)',
        'zh-Hant': '中文(繁體)',
      },
    },
    login: {
      redirecting: 'Redirecting to Discord login.',
      fallback: 'If you are not redirected,',
      clickHere: 'click this text',
      pleaseDo: 'please.',
    },
  },
  ko: {
    locale: 'ko-KR',
    app: {
      loginTitle: '어떤 방식으로 로그인할까요?',
      loginSubtitle: '로그인 없이도 채팅과 음성 통화를 사용할 수 있습니다. 이후에 Discord 로그인으로 전환할 수 있어요.',
      loginWithout: '로그인 없이',
      loginDiscord: 'Discord로 로그인',
      guestTitle: '사용할 이름을 입력하세요.',
      guestPlaceholder: '예: guest',
      back: '뒤로',
      confirm: '확인',
      copyMessage: '메시지 복사',
      deleteMessage: '메시지 삭제',
      someone: '누군가',
    },
    header: {
      channelListAria: '채널 목록',
      channel: '채널',
      members: '멤버',
      light: '라이트',
      dark: '다크',
      lightTheme: '라이트 테마',
      darkTheme: '다크 테마',
      guestSuffix: ' (게스트)',
      logout: '로그아웃',
      loginDiscord: 'Discord로 로그인',
    },
    composer: {
      placeholderLogin: '로그인을 해주세요.',
      placeholderMessage: '메시지 보내기',
      send: '보내기',
    },
    messageList: {
      loadError: '메시지를 불러오지 못했습니다.',
      retry: '다시 시도',
      loading: '메시지를 불러오는 중…',
      empty: '아직 메시지가 없습니다. 첫 메시지를 보내보세요!',
      adminTag: '👑 관리자',
    },
    sidebarChannels: {
      serverName: 'DDNet Server',
      serverSettings: '서버 설정',
      notifications: '알림 설정',
      textChannels: '텍스트 채널',
      voiceChannels: '음성 채널',
      showHidden: '숨겨진 채널 보기 ({count})',
      hideHidden: '숨겨진 채널 숨기기',
      hidden: '숨김',
      channelNamePrompt: '채널 이름을 입력하세요',
      channelName: '채널 이름',
      channelShow: '채널 표시',
      channelHide: '채널 숨기기',
      channelDelete: '채널 삭제',
      addTextChannel: '텍스트 채널 추가',
      addVoiceChannel: '음성 채널 추가',
    },
    sidebarGuilds: {
      add: '추가',
    },
    serverSettings: {
      title: 'DD Server',
      serverProfile: '서버 프로필',
      manage: '관리',
      admins: '관리자',
      adminTitle: '관리자',
      adminSubtitle: '관리자 ID를 추가하거나 삭제할 수 있습니다.',
      adminAdd: '관리자 추가',
      adminList: '관리자 목록',
      adminPlaceholder: 'Discord 사용자 ID',
      adminRemove: '관리자 삭제',
      submit: '입력',
      close: '설정 닫기',
    },
    voice: {
      title: '음성 채널',
      membersCount: '현재 {count}명 참여 중',
      leave: '나가기',
      join: '입장하기',
      micOn: '마이크 켜기',
      micOff: '마이크 끄기',
      headsetOn: '헤드셋 켜기',
      headsetOff: '헤드셋 끄기',
      micMuted: '마이크 꺼짐',
      headsetMuted: '헤드셋 꺼짐',
    },
    userSettings: {
      account: '내 계정',
      voiceVideo: '음성 및 비디오',
      language: '언어',
      titleAccount: '내 계정',
      titleVoice: '음성 설정',
      titleLanguage: '언어 설정',
      subtitleAccount: '프로필과 계정 정보를 확인하세요.',
      subtitleVoice: '마이크 민감도와 음성 입력을 조정하세요.',
      subtitleLanguage: '표시할 언어를 선택하세요.',
      nickname: '닉네임',
      profileHint: '설정 화면에서 프로필 사진과 정보를 확인할 수 있습니다.',
      guestMode: '게스트 모드',
      online: '온라인',
      micSensitivity: '마이크 민감도',
      currentInput: '현재 입력',
      detectThreshold: '감지 기준',
      detected: '감지됨',
      quiet: '조용함',
      sensitivityHint: '높을수록 작은 소리에도 마이크가 반응합니다.',
      noiseSuppression: '잡음 제거',
      noiseSuppressionHint: 'WebRTC의 노이즈 억제를 사용해 주변 소음을 줄입니다.',
      noiseSuppressionOptions: {
        webrtc: '기본',
        off: '없음',
      },
      rejoinHint: '설정 변경 후 음성 채널을 다시 입장하면 적용됩니다.',
      on: '켜짐',
      off: '꺼짐',
      inputTest: '입력 테스트',
      inputTestHint: '마이크 설정을 테스트할 때 사용하세요.',
      startTest: '테스트 시작',
      stopTest: '테스트 중지',
      testingHint: '마이크 테스트 중입니다. 말해보세요.',
      micPermission: '마이크 접근 권한이 필요합니다.',
      close: '사용자 설정 닫기',
      open: '사용자 설정 열기',
      guest: '게스트',
      guestAccount: '게스트 계정',
      myAccount: '내 계정',
      languageOptions: {
        ko: '한국어',
        en: 'English',
        'zh-Hans': '中文(简体)',
        'zh-Hant': '中文(繁體)',
      },
    },
    login: {
      redirecting: '디스코드 로그인으로 리다이렉트 중입니다.',
      fallback: '만약 이동이 되지 않는다면',
      clickHere: '이 글씨를 클릭',
      pleaseDo: '해 주세요.',
    },
  },
  'zh-Hans': {
    locale: 'zh-CN',
    app: {
      loginTitle: '请选择登录方式。',
      loginSubtitle: '无需登录也可以使用聊天和语音通话，之后可切换为 Discord 登录。',
      loginWithout: '无需登录',
      loginDiscord: '使用 Discord 登录',
      guestTitle: '请输入你想使用的名称。',
      guestPlaceholder: '例如：guest',
      back: '返回',
      confirm: '确认',
      copyMessage: '复制消息',
      deleteMessage: '删除消息',
      someone: '某人',
    },
    header: {
      channelListAria: '频道列表',
      channel: '频道',
      members: '成员',
      light: '浅色',
      dark: '深色',
      lightTheme: '浅色主题',
      darkTheme: '深色主题',
      guestSuffix: '（访客）',
      logout: '退出登录',
      loginDiscord: '使用 Discord 登录',
    },
    composer: {
      placeholderLogin: '请先登录。',
      placeholderMessage: '发送消息',
      send: '发送',
    },
    messageList: {
      loadError: '无法加载消息。',
      retry: '重试',
      loading: '正在加载消息…',
      empty: '还没有消息，发送第一条吧！',
      adminTag: '👑 管理员',
    },
    sidebarChannels: {
      serverName: 'DDNet Server',
      serverSettings: '服务器设置',
      notifications: '通知设置',
      textChannels: '文字频道',
      voiceChannels: '语音频道',
      showHidden: '显示隐藏频道（{count}）',
      hideHidden: '隐藏已隐藏频道',
      hidden: '隐藏',
      channelNamePrompt: '请输入频道名称',
      channelName: '频道名称',
      channelShow: '显示频道',
      channelHide: '隐藏频道',
      channelDelete: '删除频道',
      addTextChannel: '新增文字频道',
      addVoiceChannel: '新增语音频道',
    },
    sidebarGuilds: {
      add: '新增',
    },
    serverSettings: {
      title: 'DD Server',
      serverProfile: '服务器资料',
      manage: '管理',
      admins: '管理员',
      adminTitle: '管理员',
      adminSubtitle: '添加或删除管理员 ID。',
      adminAdd: '添加管理员',
      adminList: '管理员列表',
      adminPlaceholder: 'Discord 用户 ID',
      adminRemove: '删除管理员',
      submit: '提交',
      close: '关闭设置',
    },
    voice: {
      title: '语音频道',
      membersCount: '当前 {count} 人在线',
      leave: '退出',
      join: '加入',
      micOn: '开启麦克风',
      micOff: '关闭麦克风',
      headsetOn: '开启耳机',
      headsetOff: '关闭耳机',
      micMuted: '麦克风已关闭',
      headsetMuted: '耳机已关闭',
    },
    userSettings: {
      account: '我的账户',
      voiceVideo: '语音与视频',
      language: '语言',
      titleAccount: '我的账户',
      titleVoice: '语音设置',
      titleLanguage: '语言设置',
      subtitleAccount: '查看你的资料与账号信息。',
      subtitleVoice: '调整麦克风灵敏度与语音输入。',
      subtitleLanguage: '选择要显示的语言。',
      nickname: '昵称',
      profileHint: '你可以在设置中查看头像与资料信息。',
      guestMode: '访客模式',
      online: '在线',
      micSensitivity: '麦克风灵敏度',
      currentInput: '当前输入',
      detectThreshold: '检测阈值',
      detected: '已检测',
      quiet: '安静',
      sensitivityHint: '数值越高，麦克风越容易响应微小声音。',
      noiseSuppression: '噪声抑制',
      noiseSuppressionHint: '使用 WebRTC 噪声抑制降低背景噪声。',
      noiseSuppressionOptions: {
        webrtc: '??',
        off: '?',
      },
      rejoinHint: '更改后请重新进入语音频道以生效。',
      on: '开启',
      off: '关闭',
      inputTest: '输入测试',
      inputTestHint: '用于测试麦克风设置。',
      startTest: '开始测试',
      stopTest: '停止测试',
      testingHint: '麦克风测试中，请说话。',
      micPermission: '需要麦克风访问权限。',
      close: '关闭用户设置',
      open: '打开用户设置',
      guest: '访客',
      guestAccount: '访客账户',
      myAccount: '我的账户',
      languageOptions: {
        ko: '한국어',
        en: 'English',
        'zh-Hans': '中文(简体)',
        'zh-Hant': '中文(繁體)',
      },
    },
    login: {
      redirecting: '正在跳转到 Discord 登录。',
      fallback: '如果未自动跳转，',
      clickHere: '点击此文字',
      pleaseDo: '即可。',
    },
  },
  'zh-Hant': {
    locale: 'zh-TW',
    app: {
      loginTitle: '請選擇登入方式。',
      loginSubtitle: '無需登入也能使用聊天與語音通話，之後可切換為 Discord 登入。',
      loginWithout: '不登入',
      loginDiscord: '使用 Discord 登入',
      guestTitle: '請輸入要使用的名稱。',
      guestPlaceholder: '例如：guest',
      back: '返回',
      confirm: '確認',
      copyMessage: '複製訊息',
      deleteMessage: '刪除訊息',
      someone: '某人',
    },
    header: {
      channelListAria: '頻道清單',
      channel: '頻道',
      members: '成員',
      light: '亮色',
      dark: '深色',
      lightTheme: '亮色主題',
      darkTheme: '深色主題',
      guestSuffix: '（訪客）',
      logout: '登出',
      loginDiscord: '使用 Discord 登入',
    },
    composer: {
      placeholderLogin: '請先登入。',
      placeholderMessage: '傳送訊息',
      send: '傳送',
    },
    messageList: {
      loadError: '無法載入訊息。',
      retry: '重新嘗試',
      loading: '正在載入訊息…',
      empty: '尚無訊息，先送出第一則吧！',
      adminTag: '👑 管理員',
    },
    sidebarChannels: {
      serverName: 'DDNet Server',
      serverSettings: '伺服器設定',
      notifications: '通知設定',
      textChannels: '文字頻道',
      voiceChannels: '語音頻道',
      showHidden: '顯示隱藏頻道（{count}）',
      hideHidden: '隱藏隱藏頻道',
      hidden: '隱藏',
      channelNamePrompt: '請輸入頻道名稱',
      channelName: '頻道名稱',
      channelShow: '顯示頻道',
      channelHide: '隱藏頻道',
      channelDelete: '刪除頻道',
      addTextChannel: '新增文字頻道',
      addVoiceChannel: '新增語音頻道',
    },
    sidebarGuilds: {
      add: '新增',
    },
    serverSettings: {
      title: 'DD Server',
      serverProfile: '伺服器資訊',
      manage: '管理',
      admins: '管理員',
      adminTitle: '管理員',
      adminSubtitle: '新增或移除管理員 ID。',
      adminAdd: '新增管理員',
      adminList: '管理員清單',
      adminPlaceholder: 'Discord 使用者 ID',
      adminRemove: '移除管理員',
      submit: '提交',
      close: '關閉設定',
    },
    voice: {
      title: '語音頻道',
      membersCount: '目前 {count} 人在線',
      leave: '離開',
      join: '加入',
      micOn: '開啟麥克風',
      micOff: '關閉麥克風',
      headsetOn: '開啟耳機',
      headsetOff: '關閉耳機',
      micMuted: '麥克風已關閉',
      headsetMuted: '耳機已關閉',
    },
    userSettings: {
      account: '我的帳號',
      voiceVideo: '語音與影片',
      language: '語言',
      titleAccount: '我的帳號',
      titleVoice: '語音設定',
      titleLanguage: '語言設定',
      subtitleAccount: '檢視你的個人檔案與帳號資訊。',
      subtitleVoice: '調整麥克風敏感度與語輸入。',
      subtitleLanguage: '選擇要顯示的語言。',
      nickname: '暱稱',
      profileHint: '你可以在設定中查看頭像與個人資訊。',
      guestMode: '訪客模式',
      online: '線上',
      micSensitivity: '克風敏感度',
      currentInput: '目前輸入',
      detectThreshold: '偵測門檻',
      detected: '已偵測',
      quiet: '安靜',
      sensitivityHint: '數值越高，麥克風越容易回應細微聲音。',
      noiseSuppression: '雜訊抑制',
      noiseSuppressionHint: '使用 WebRTC 雜訊抑制降低背景噪音。',
      noiseSuppressionOptions: {
        webrtc: '??',
        off: '?',
      },
      rejoinHint: '變更後請重新進入語音頻道以生效。',
      on: '開啟',
      off: '關閉',
      inputTest: '輸入測試',
      inputTestHint: '用於測試麥克風設定。',
      startTest: '開始測試',
      stopTest: '停止測試',
      testingHint: '麥克風測試中，請說話。',
      micPermission: '需要麥克風存取權限。',
      close: '關閉使用者設定',
      open: '開啟使用者設定',
      guest: '訪客',
      guestAccount: '訪客帳號',
      myAccount: '我的帳號',
      languageOptions: {
        ko: '한국어',
        en: 'English',
        'zh-Hans': '中文(简体)',
        'zh-Hant': '中文(繁體)',
      },
    },
    login: {
      redirecting: '正在重新導向至 Discord 登入。',
      fallback: '如果沒有自動跳轉，',
      clickHere: '請點擊這段文字',
      pleaseDo: '。',
    },
  },
}

export const getStoredLanguage = (): Language => {
  if (typeof window === 'undefined') return 'en'
  const stored = window.localStorage.getItem('ui-language')
  if (stored === 'en' || stored === 'zh-Hans' || stored === 'zh-Hant' || stored === 'ko') return stored
  return 'en'
}

export const getTranslations = (language: Language): UiText => translations[language] ?? translations.ko

export const formatText = (template: string, vars: Record<string, string | number>) =>
  template.replace(/\{(\w+)\}/g, (_, key) => String(vars[key] ?? ''))
