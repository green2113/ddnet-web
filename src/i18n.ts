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
    copyImage: string
    saveImage: string
    copyUserId: string
    kickUser: string
    banUser: string
    kickTitle: string
    kickPrompt: string
    banTitle: string
    banPrompt: string
    reasonLabel: string
    reasonPlaceholder: string
    moderationCancel: string
    kickConfirm: string
    banConfirm: string
    deleteMessage: string
    someone: string
    serverActionTitle: string
    serverActionTitleCreate: string
    serverActionTitleJoin: string
    serverActionSelectDescription: string
    serverActionCreateDescription: string
    serverActionJoinDescription: string
    serverActionNameHint: string
    serverActionNameLabel: string
    serverActionBack: string
    serverActionCreateButton: string
    serverActionJoinInstruction: string
    serverActionJoinPlaceholder: string
    serverActionJoinButton: string
    serverActionJoinLoading: string
    serverActionCreateFailed: string
    serverActionJoinFailed: string
    serverActionJoinMissing: string
    serverActionJoinInvalid: string
    serverActionJoinExpired: string
    inviteLinkLoading: string
    inviteLinkFailed: string
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
    placeholderMessageWithChannel: string
    send: string
  }
  messageList: {
    loadError: string
    retry: string
    loading: string
    empty: string
    adminTag: string
  }
  home: {
    friends: string
    online: string
    addFriend: string
    addFriendDescription: string
    addFriendPlaceholder: string
    addFriendAction: string
    friendAddFailed: string
    all: string
    pending: string
    pendingIncoming: string
    pendingOutgoing: string
    pendingEmpty: string
    pendingOutgoingEmpty: string
    pendingStatus: string
    accept: string
    reject: string
    friendsEmpty: string
    removeFriend: string
    messageRequests: string
    directMessages: string
    directEmpty: string
    directFallback: string
    activity: string
    activityItem: string
    activityHint: string
  }
  sidebarChannels: {
    serverName: string
    serverSettings: string
    invite: string
    notifications: string
    createCategory: string
    channelsTitle: string
    guestDisabled: string
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
    createTitle: string
    createSubtitle: string
    createCategoryTitle: string
    createCategorySubtitle: string
    channelType: string
    textOption: string
    textOptionDesc: string
    voiceOption: string
    voiceOptionDesc: string
    categoryOption: string
    categoryOptionDesc: string
    channelNameLabel: string
    channelNamePlaceholder: string
    categoryNameLabel: string
    categoryNamePlaceholder: string
    categorySelectLabel: string
    categorySelectNone: string
    cancelCreate: string
    confirmCreate: string
    closeCreate: string
    leaveServer: string
    leaveServerTitle: string
    leaveServerPrompt: string
    leaveServerConfirm: string
    leaveServerCancel: string
    leaveServerFailed: string
  }
  sidebarGuilds: {
    add: string
    addTooltip: string
  }
  serverSettings: {
    title: string
    serverProfile: string
    users: string
    invites: string
    manage: string
    admins: string
    bans: string
    profileTitle: string
    profileSubtitle: string
    nameLabel: string
    namePlaceholder: string
    nameSave: string
    nameSaving: string
    nameRequired: string
    nameSaveFailed: string
    iconLabel: string
    iconHint: string
    iconChange: string
    iconUploading: string
    iconSaveFailed: string
    previewTitle: string
    invitesTitle: string
    invitesSubtitle: string
    inviteEmpty: string
    inviteCreator: string
    inviteCode: string
    inviteCreatedAt: string
    inviteExpires: string
    inviteNoExpire: string
    inviteExpired: string
    inviteDelete: string
    bansTitle: string
    bansSubtitle: string
    bansEmpty: string
    unban: string
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
    disconnect: string
    join: string
    screenShare: string
    stopShare: string
    screenShareYou: string
    screenShareUnsupported: string
    screenShareFailed: string
    screenShareSelectTitle: string
    screenShareSelectHint: string
    screenShareSelectCancel: string
    screenShareSelectConfirm: string
    screenShareSelectNone: string
    screenShareSettings: string
    screenShareResolution: string
    screenShareFrameRate: string
    screenShareMuteAudio: string
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
    displayNameLabel: string
    displayNamePlaceholder: string
    saveChanges: string
    saving: string
    changeAvatar: string
    uploadingAvatar: string
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
    outputDevice: string
    inputDevice: string
    deviceDefault: string
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
    logout: string
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
    loginTab: string
    signupTab: string
    usernameLabel: string
    usernamePlaceholder: string
    emailLabel: string
    emailPlaceholder: string
    passwordLabel: string
    passwordPlaceholder: string
    loginAction: string
    signupAction: string
    discordAction: string
    guestLabel: string
    guestPlaceholder: string
    guestAction: string
    guestDivider: string
    guestRequired: string
    guestLoading: string
    errorGeneric: string
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
      copyImage: 'Copy image',
      saveImage: 'Save image',
      copyUserId: 'Copy user ID',
      kickUser: 'Kick {name}',
      banUser: 'Ban {name}',
      kickTitle: 'Kick {name} from the server',
      kickPrompt: 'They can rejoin if they get a new invite.',
      banTitle: 'Ban {name} from the server?',
      banPrompt: 'They will not be able to join until unbanned.',
      reasonLabel: 'Reason (optional)',
      reasonPlaceholder: 'Add a short reason...',
      moderationCancel: 'Cancel',
      kickConfirm: 'Kick',
      banConfirm: 'Ban',
      deleteMessage: 'Delete message',
      someone: 'Someone',
      serverActionTitle: 'Server',
      serverActionTitleCreate: 'Create server',
      serverActionTitleJoin: 'Join server',
      serverActionSelectDescription: 'Create a server or join one with an invite.',
      serverActionCreateDescription: 'Create a server and invite your friends.',
      serverActionJoinDescription: 'Join with an invite link or code.',
      serverActionNameHint: 'You can change the server name anytime.',
      serverActionNameLabel: 'Server name',
      serverActionBack: 'Back',
      serverActionCreateButton: 'Create',
      serverActionJoinInstruction: 'Enter an invite link or code.',
      serverActionJoinPlaceholder: 'Paste an invite link or code.',
      serverActionJoinButton: 'Join',
      serverActionJoinLoading: 'Joining...',
      serverActionCreateFailed: 'Failed to create the server.',
      serverActionJoinFailed: 'Unable to join the server.',
      serverActionJoinMissing: 'Please enter an invite link or code.',
      serverActionJoinInvalid: 'That invite link is invalid.',
      serverActionJoinExpired: 'That invite link has expired.',
      inviteLinkLoading: 'Creating link...',
      inviteLinkFailed: 'Failed to create an invite link.',
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
      placeholderMessageWithChannel: 'Message # {channel}',
      send: 'Send',
    },
    messageList: {
      loadError: 'Failed to load messages.',
      retry: 'Try again',
      loading: 'Loading messages…',
      empty: 'No messages yet. Send the first one!',
      adminTag: '👑 Admin',
    },
    home: {
      friends: 'Friends',
      online: 'Online',
      addFriend: 'Add Friend',
      addFriendDescription: 'Add friends with their username.',
      addFriendPlaceholder: 'Enter a username (without @)',
      addFriendAction: 'Send',
      friendAddFailed: 'Unable to send request.',
      all: 'All',
      pending: 'Pending',
      pendingIncoming: 'Incoming requests',
      pendingOutgoing: 'Outgoing requests',
      pendingEmpty: 'No incoming requests.',
      pendingOutgoingEmpty: 'No outgoing requests.',
      pendingStatus: 'Pending',
      accept: 'Accept',
      reject: 'Ignore',
      friendsEmpty: 'No friends yet. Add someone to start chatting.',
      removeFriend: 'Remove',
      messageRequests: 'Message Requests',
      directMessages: 'Direct Messages',
      directEmpty: 'No direct messages yet.',
      directFallback: 'Direct message',
      activity: 'Active now',
      activityItem: 'Activity {idx}',
      activityHint: 'Jump in now',
    },
    sidebarChannels: {
      serverName: 'Server',
      serverSettings: 'Server settings',
      invite: 'Invite to server',
      notifications: 'Notification settings',
      createCategory: 'Create category',
      channelsTitle: 'Channels',
      guestDisabled: 'This feature is disabled in guest mode.',
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
      createTitle: 'Create channel',
      createSubtitle: 'Create a new channel in this server.',
      createCategoryTitle: 'Create category',
      createCategorySubtitle: 'Create a new category for channels.',
      channelType: 'Channel type',
      textOption: 'Text',
      textOptionDesc: 'Send messages, images, GIFs, and more.',
      voiceOption: 'Voice',
      voiceOptionDesc: 'Hang out with voice and screen share.',
      categoryOption: 'Category',
      categoryOptionDesc: 'Group channels into sections.',
      channelNameLabel: 'Channel name',
      channelNamePlaceholder: 'new-channel',
      categoryNameLabel: 'Category name',
      categoryNamePlaceholder: 'New category',
      categorySelectLabel: 'Category',
      categorySelectNone: 'No category',
      cancelCreate: 'Cancel',
      confirmCreate: 'Create channel',
      closeCreate: 'Close',
      leaveServer: 'Leave server',
      leaveServerTitle: 'Leave this server?',
      leaveServerPrompt: 'You will lose access to this server until you are invited again.',
      leaveServerConfirm: 'Leave',
      leaveServerCancel: 'Cancel',
      leaveServerFailed: 'Failed to leave the server.',
    },
    sidebarGuilds: {
      add: 'Add',
      addTooltip: 'Add server',
    },
    serverSettings: {
      title: 'DD Server',
      serverProfile: 'Server profile',
      users: 'Users',
      invites: 'Invites',
      manage: 'Manage',
      admins: 'Admins',
      bans: 'Bans',
      profileTitle: 'Server profile',
      profileSubtitle: 'Update the server name and icon.',
      nameLabel: 'Server name',
      namePlaceholder: 'Enter a server name',
      nameSave: 'Save',
      nameSaving: 'Saving...',
      nameRequired: 'Server name is required.',
      nameSaveFailed: 'Failed to update the server name.',
      iconLabel: 'Server icon',
      iconHint: 'Square image recommended (at least 256x256).',
      iconChange: 'Change icon',
      iconUploading: 'Uploading...',
      iconSaveFailed: 'Failed to update the server icon.',
      previewTitle: 'Preview',
      invitesTitle: 'Invites',
      invitesSubtitle: 'See and revoke invite links for this server.',
      inviteEmpty: 'No invites yet.',
      inviteCreator: 'Creator',
      inviteCode: 'Invite code',
      inviteCreatedAt: 'Created',
      inviteExpires: 'Expires',
      inviteNoExpire: 'Never',
      inviteExpired: 'Expired',
      inviteDelete: 'Delete invite',
      bansTitle: 'Bans',
      bansSubtitle: 'Manage banned users for this server.',
      bansEmpty: 'No banned users.',
      unban: 'Unban',
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
      disconnect: 'Disconnect',
      join: 'Join',
      screenShare: 'Share screen',
      stopShare: 'Stop sharing',
      screenShareYou: 'Your screen',
      screenShareUnsupported: 'Screen share is not supported in this environment.',
      screenShareFailed: 'Failed to start screen sharing.',
      screenShareSelectTitle: 'Select a screen',
      screenShareSelectHint: 'Choose a screen or window to share.',
      screenShareSelectCancel: 'Cancel',
      screenShareSelectConfirm: 'Share',
      screenShareSelectNone: 'Select a screen to share.',
      screenShareSettings: 'Screen share settings',
      screenShareResolution: 'Resolution',
      screenShareFrameRate: 'Frame rate',
      screenShareMuteAudio: 'Mute stream audio',
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
      displayNameLabel: 'Display name',
      displayNamePlaceholder: 'Enter a display name',
      saveChanges: 'Save changes',
      saving: 'Saving…',
      changeAvatar: 'Change avatar',
      uploadingAvatar: 'Uploading…',
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
      outputDevice: 'Output device',
      inputDevice: 'Input device',
      deviceDefault: 'Default',
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
      logout: 'Logout',
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
      loginTab: 'Login',
      signupTab: 'Sign up',
      usernameLabel: 'Username',
      usernamePlaceholder: 'Enter a username',
      emailLabel: 'Email',
      emailPlaceholder: 'you@example.com',
      passwordLabel: 'Password',
      passwordPlaceholder: 'Enter your password',
      loginAction: 'Log in',
      signupAction: 'Create account',
      discordAction: 'Continue with Discord',
      guestLabel: 'Guest name',
      guestPlaceholder: 'Enter a name',
      guestAction: 'Continue as guest',
      guestDivider: 'or',
      guestRequired: 'Please enter a name.',
      guestLoading: 'Joining…',
      errorGeneric: 'Something went wrong. Please try again.',
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
      copyImage: '이미지 복사',
      saveImage: '이미지 저장',
      copyUserId: '사용자 ID 복사하기',
      kickUser: '{name}님 추방하기',
      banUser: '{name}님 차단하기',
      kickTitle: '{name}님 서버에서 추방하기',
      kickPrompt: '새 초대를 받으면 다시 참가할 수 있어요.',
      banTitle: '{name}님을 차단할까요?',
      banPrompt: '차단을 해제하기 전까지 다시 들어올 수 없어요.',
      reasonLabel: '사유 (선택)',
      reasonPlaceholder: '사유를 간단히 적어주세요.',
      moderationCancel: '취소',
      kickConfirm: '추방하기',
      banConfirm: '차단하기',
      deleteMessage: '메시지 삭제',
      someone: '누군가',
      serverActionTitle: '서버',
      serverActionTitleCreate: '서버 만들기',
      serverActionTitleJoin: '서버 들어가기',
      serverActionSelectDescription: '서버를 직접 만들거나 초대 링크로 참여할 수 있어요.',
      serverActionCreateDescription: '서버를 생성하고 친구들을 초대해 보세요.',
      serverActionJoinDescription: '초대 링크나 코드를 입력해서 참여해요.',
      serverActionNameHint: '서버 이름은 언제든지 변경할 수 있어요.',
      serverActionNameLabel: '서버 이름',
      serverActionBack: '뒤로',
      serverActionCreateButton: '만들기',
      serverActionJoinInstruction: '초대 링크 또는 코드를 입력해 주세요.',
      serverActionJoinPlaceholder: '초대 링크 또는 코드를 넣어주세요.',
      serverActionJoinButton: '입장하기',
      serverActionJoinLoading: '입장 중...',
      serverActionCreateFailed: '서버 생성에 실패했습니다.',
      serverActionJoinFailed: '서버에 참가할 수 없습니다.',
      serverActionJoinMissing: '초대 링크 또는 코드를 입력해 주세요.',
      serverActionJoinInvalid: '유효하지 않은 초대 링크입니다.',
      serverActionJoinExpired: '만료된 초대 링크입니다.',
      inviteLinkLoading: '링크 만드는 중...',
      inviteLinkFailed: '초대 링크를 생성하지 못했어요.',
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
      placeholderMessageWithChannel: '# {channel}에 메시지 보내기',
      send: '보내기',
    },
    messageList: {
      loadError: '메시지를 불러오지 못했습니다.',
      retry: '다시 시도',
      loading: '메시지를 불러오는 중…',
      empty: '아직 메시지가 없습니다. 첫 메시지를 보내보세요!',
      adminTag: '👑 관리자',
    },
    home: {
      friends: '친구',
      online: '온라인',
      addFriend: '친구 추가하기',
      addFriendDescription: '사용자 이름으로 친구를 추가할 수 있어요.',
      addFriendPlaceholder: '사용자 이름 입력 (@ 없이)',
      addFriendAction: '추가',
      friendAddFailed: '친구 요청을 보내지 못했어요.',
      all: '모두',
      pending: '대기 중',
      pendingIncoming: '받은 요청',
      pendingOutgoing: '보낸 요청',
      pendingEmpty: '받은 요청이 없습니다.',
      pendingOutgoingEmpty: '보낸 요청이 없습니다.',
      pendingStatus: '대기 중',
      accept: '수락',
      reject: '거절',
      friendsEmpty: '아직 친구가 없습니다. 친구를 추가해 보세요.',
      removeFriend: '삭제',
      messageRequests: '메시지 요청',
      directMessages: '다이렉트 만들기',
      directEmpty: '아직 다이렉트가 없습니다.',
      directFallback: '다이렉트 메시지',
      activity: '현재 활동 중',
      activityItem: '활동 {idx}',
      activityHint: '지금 참여 중',
    },
    sidebarChannels: {
      serverName: '서버',
      serverSettings: '서버 설정',
      invite: '서버에 초대하기',
      notifications: '알림 설정',
      createCategory: '카테고리 만들기',
      channelsTitle: '채널',
      guestDisabled: '게스트 모드에서는 해당 기능이 비활성화돼요.',
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
      createTitle: '채널 만들기',
      createSubtitle: '이 서버에 새 채널을 만드세요.',
      createCategoryTitle: '카테고리 만들기',
      createCategorySubtitle: '채널을 묶을 새 카테고리를 만드세요.',
      channelType: '채널 유형',
      textOption: '텍스트',
      textOptionDesc: '메시지, 이미지, GIF 등을 전송하세요.',
      voiceOption: '음성',
      voiceOptionDesc: '음성 채팅과 화면 공유로 함께하세요.',
      categoryOption: '카테고리',
      categoryOptionDesc: '채널을 섹션으로 묶습니다.',
      channelNameLabel: '채널 이름',
      channelNamePlaceholder: '새로운-채널',
      categoryNameLabel: '카테고리 이름',
      categoryNamePlaceholder: '새 카테고리',
      categorySelectLabel: '카테고리',
      categorySelectNone: '카테고리 없음',
      cancelCreate: '취소',
      confirmCreate: '채널 만들기',
      closeCreate: '닫기',
      leaveServer: '서버 나가기',
      leaveServerTitle: '정말 나가시겠어요?',
      leaveServerPrompt: '나가면 다시 초대받기 전까지 이 서버에 접근할 수 없어요.',
      leaveServerConfirm: '나가기',
      leaveServerCancel: '취소',
      leaveServerFailed: '서버 나가기에 실패했어요.',
    },
    sidebarGuilds: {
      add: '추가',
      addTooltip: '서버 추가하기',
    },
    serverSettings: {
      title: 'DD Server',
      serverProfile: '서버 프로필',
      users: '유저',
      invites: '초대',
      manage: '관리',
      admins: '관리자',
      bans: '차단',
      profileTitle: '서버 프로필',
      profileSubtitle: '서버 이름과 아이콘을 변경할 수 있습니다.',
      nameLabel: '서버 이름',
      namePlaceholder: '서버 이름을 입력하세요',
      nameSave: '저장',
      nameSaving: '저장 중',
      nameRequired: '서버 이름을 입력해주세요.',
      nameSaveFailed: '서버 이름을 변경하지 못했어요.',
      iconLabel: '서버 아이콘',
      iconHint: '정사각형 이미지(최소 256x256)를 권장해요.',
      iconChange: '아이콘 변경',
      iconUploading: '업로드 중',
      iconSaveFailed: '서버 아이콘을 변경하지 못했어요.',
      previewTitle: '미리보기',
      invitesTitle: '초대',
      invitesSubtitle: '이 서버에서 만들어진 초대 링크를 확인하세요.',
      inviteEmpty: '아직 만든 초대장이 없습니다.',
      inviteCreator: '초대자',
      inviteCode: '초대 코드',
      inviteCreatedAt: '생성 시간',
      inviteExpires: '남은 시간',
      inviteNoExpire: '무기한',
      inviteExpired: '만료됨',
      inviteDelete: '초대장 삭제',
      bansTitle: '차단',
      bansSubtitle: '차단된 사용자를 관리할 수 있습니다.',
      bansEmpty: '차단된 사용자가 없습니다.',
      unban: '차단 해제',
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
      disconnect: '연결 끊기',
      join: '입장하기',
      screenShare: '화면 공유',
      stopShare: '화면 공유 중지',
      screenShareYou: '내 화면',
      screenShareUnsupported: '이 환경에서는 화면 공유를 지원하지 않아요.',
      screenShareFailed: '화면 공유를 시작하지 못했어요.',
      screenShareSelectTitle: '화면 선택',
      screenShareSelectHint: '공유할 화면이나 창을 선택하세요.',
      screenShareSelectCancel: '취소',
      screenShareSelectConfirm: '공유하기',
      screenShareSelectNone: '공유할 화면을 선택해 주세요.',
      screenShareSettings: '화면 공유 설정',
      screenShareResolution: '화면 해상도',
      screenShareFrameRate: '프레임률',
      screenShareMuteAudio: '방송 소리 음소거',
      micOn: '음소거 해제',
      micOff: '음소거',
      headsetOn: '헤드셋 음소거 해제',
      headsetOff: '헤드셋 음소거',
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
      displayNameLabel: '디스플레이 이름',
      displayNamePlaceholder: '디스플레이 이름을 입력하세요',
      saveChanges: '변경 저장',
      saving: '저장 중...',
      changeAvatar: '프로필 사진 변경',
      uploadingAvatar: '업로드 중...',
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
      outputDevice: '출력 장치',
      inputDevice: '입력 장치',
      deviceDefault: '기본',
      rejoinHint: '설정 변경 후 음성 채널을 다시 입장하면 적용됩니다.',
      on: '켜짐',
      off: '꺼짐',
      inputTest: '입력 테스트',
      inputTestHint: '마이크 설정을 테스트할 때 사용하세요.',
      startTest: '테스트 시작',
      stopTest: '테스트 중지',
      testingHint: '목소리를 듣고 있어요. 말을 해보세요.',
      micPermission: '마이크 접근 권한이 필요합니다.',
      close: '사용자 설정',
      open: '사용자 설정',
      logout: '로그아웃',
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
      loginTab: '로그인',
      signupTab: '회원가입',
      usernameLabel: '사용자 이름',
      usernamePlaceholder: '사용할 이름을 입력하세요',
      emailLabel: '이메일',
      emailPlaceholder: 'you@example.com',
      passwordLabel: '비밀번호',
      passwordPlaceholder: '비밀번호를 입력하세요',
      loginAction: '로그인',
      signupAction: '계정 만들기',
      discordAction: 'Discord로 계속하기',
      guestLabel: '게스트 이름',
      guestPlaceholder: '이름을 입력하세요',
      guestAction: '게스트로 시작',
      guestDivider: '또는',
      guestRequired: '이름을 입력해 주세요.',
      guestLoading: '입장 중...',
      errorGeneric: '문제가 발생했습니다. 다시 시도해 주세요.',
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
      copyImage: '复制图片',
      saveImage: '保存图片',
      copyUserId: '复制用户 ID',
      kickUser: '踢出 {name}',
      banUser: '封禁 {name}',
      kickTitle: '将 {name} 踢出服务器',
      kickPrompt: '若收到新的邀请可重新加入。',
      banTitle: '要封禁 {name} 吗？',
      banPrompt: '在解除封禁前无法再次加入。',
      reasonLabel: '原因（可选）',
      reasonPlaceholder: '填写简短原因…',
      moderationCancel: '取消',
      kickConfirm: '踢出',
      banConfirm: '封禁',
      deleteMessage: '删除消息',
      someone: '某人',
      serverActionTitle: '服务器',
      serverActionTitleCreate: '创建服务器',
      serverActionTitleJoin: '加入服务器',
      serverActionSelectDescription: '创建服务器或通过邀请链接加入。',
      serverActionCreateDescription: '创建服务器并邀请朋友加入。',
      serverActionJoinDescription: '通过邀请链接或代码加入。',
      serverActionNameHint: '服务器名称可随时更改。',
      serverActionNameLabel: '服务器名称',
      serverActionBack: '返回',
      serverActionCreateButton: '创建',
      serverActionJoinInstruction: '请输入邀请链接或代码。',
      serverActionJoinPlaceholder: '粘贴邀请链接或代码。',
      serverActionJoinButton: '加入',
      serverActionJoinLoading: '正在加入...',
      serverActionCreateFailed: '创建服务器失败。',
      serverActionJoinFailed: '无法加入服务器。',
      serverActionJoinMissing: '请输入邀请链接或代码。',
      serverActionJoinInvalid: '邀请链接无效。',
      serverActionJoinExpired: '邀请链接已过期。',
      inviteLinkLoading: '正在生成链接...',
      inviteLinkFailed: '无法生成邀请链接。',
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
      placeholderMessageWithChannel: '在 # {channel} 中发送消息',
      send: '发送',
    },
    messageList: {
      loadError: '无法加载消息。',
      retry: '重试',
      loading: '正在加载消息…',
      empty: '还没有消息，发送第一条吧！',
      adminTag: '👑 管理员',
    },
    home: {
      friends: '好友',
      online: '在线',
      addFriend: '添加好友',
      addFriendDescription: '使用用户名添加好友。',
      addFriendPlaceholder: '输入用户名（不含 @）',
      addFriendAction: '发送',
      friendAddFailed: '无法发送好友请求。',
      all: '全部',
      pending: '待处理',
      pendingIncoming: '收到的请求',
      pendingOutgoing: '已发送的请求',
      pendingEmpty: '暂无收到的请求。',
      pendingOutgoingEmpty: '暂无发送的请求。',
      pendingStatus: '待处理',
      accept: '接受',
      reject: '忽略',
      friendsEmpty: '还没有好友，先添加一个吧。',
      removeFriend: '删除',
      messageRequests: '消息请求',
      directMessages: '私信',
      directEmpty: '暂无私信。',
      directFallback: '私信',
      activity: '正在活动',
      activityItem: '活动 {idx}',
      activityHint: '马上加入',
    },
    sidebarChannels: {
      serverName: '服务器',
      serverSettings: '服务器设置',
      invite: '邀请加入服务器',
      notifications: '通知设置',
      createCategory: '创建分类',
      channelsTitle: '频道',
      guestDisabled: '访客模式下此功能不可用。',
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
      createTitle: '创建频道',
      createSubtitle: '在此服务器创建新频道。',
      createCategoryTitle: '创建分类',
      createCategorySubtitle: '创建一个新的分类来整理频道。',
      channelType: '频道类型',
      textOption: '文字',
      textOptionDesc: '发送消息、图片、GIF 等。',
      voiceOption: '语音',
      voiceOptionDesc: '使用语音聊天和屏幕共享。',
      categoryOption: '分类',
      categoryOptionDesc: '将频道分组到分类中。',
      channelNameLabel: '频道名称',
      channelNamePlaceholder: '新的频道',
      categoryNameLabel: '分类名称',
      categoryNamePlaceholder: '新分类',
      categorySelectLabel: '分类',
      categorySelectNone: '不使用分类',
      cancelCreate: '取消',
      confirmCreate: '创建频道',
      closeCreate: '关闭',
      leaveServer: '离开服务器',
      leaveServerTitle: '确定要离开吗？',
      leaveServerPrompt: '离开后需再次被邀请才能访问此服务器。',
      leaveServerConfirm: '离开',
      leaveServerCancel: '取消',
      leaveServerFailed: '离开服务器失败。',
    },
    sidebarGuilds: {
      add: '新增',
      addTooltip: '新增伺服器',
    },
    serverSettings: {
      title: 'DD Server',
      serverProfile: '服务器资料',
      users: '用户',
      invites: '邀请',
      manage: '管理',
      admins: '管理员',
      bans: '封禁',
      profileTitle: '服务器资料',
      profileSubtitle: '在此更新服务器名称与图标。',
      nameLabel: '服务器名称',
      namePlaceholder: '输入服务器名称',
      nameSave: '保存',
      nameSaving: '保存中',
      nameRequired: '请输入服务器名称。',
      nameSaveFailed: '无法更新服务器名称。',
      iconLabel: '服务器图标',
      iconHint: '推荐使用方形图片（至少 256x256）。',
      iconChange: '更改图标',
      iconUploading: '上传中',
      iconSaveFailed: '无法更新服务器图标。',
      previewTitle: '预览',
      invitesTitle: '邀请',
      invitesSubtitle: '查看并管理此服务器的邀请链接。',
      inviteEmpty: '暂无邀请链接。',
      inviteCreator: '邀请者',
      inviteCode: '邀请代码',
      inviteCreatedAt: '创建时间',
      inviteExpires: '剩余时间',
      inviteNoExpire: '永久',
      inviteExpired: '已过期',
      inviteDelete: '删除邀请',
      bansTitle: '封禁',
      bansSubtitle: '管理此服务器的封禁用户。',
      bansEmpty: '暂无封禁用户。',
      unban: '解除封禁',
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
      disconnect: '断开连接',
      join: '加入',
      screenShare: '屏幕共享',
      stopShare: '停止共享',
      screenShareYou: '你的屏幕',
      screenShareUnsupported: '当前环境不支持屏幕共享。',
      screenShareFailed: '无法开始屏幕共享。',
      screenShareSelectTitle: '选择屏幕',
      screenShareSelectHint: '选择要共享的屏幕或窗口。',
      screenShareSelectCancel: '取消',
      screenShareSelectConfirm: '共享',
      screenShareSelectNone: '请选择要共享的屏幕。',
      screenShareSettings: '屏幕共享设置',
      screenShareResolution: '画面分辨率',
      screenShareFrameRate: '帧率',
      screenShareMuteAudio: '静音共享音频',
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
      displayNameLabel: '显示名称',
      displayNamePlaceholder: '输入显示名称',
      saveChanges: '保存更改',
      saving: '保存中…',
      changeAvatar: '更换头像',
      uploadingAvatar: '上传中…',
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
        webrtc: '默认',
        off: '关闭',
      },
      outputDevice: '输出设备',
      inputDevice: '输入设备',
      deviceDefault: '默认',
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
      logout: '退出登录',
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
      loginTab: '登录',
      signupTab: '注册',
      usernameLabel: '昵称',
      usernamePlaceholder: '请输入昵称',
      emailLabel: '邮箱',
      emailPlaceholder: 'you@example.com',
      passwordLabel: '密码',
      passwordPlaceholder: '请输入密码',
      loginAction: '登录',
      signupAction: '创建账号',
      discordAction: '使用 Discord 继续',
      guestLabel: '访客名称',
      guestPlaceholder: '请输入名称',
      guestAction: '以访客身份继续',
      guestDivider: '或',
      guestRequired: '请输入名称。',
      guestLoading: '正在进入…',
      errorGeneric: '发生错误，请重试。',
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
      copyImage: '複製圖片',
      saveImage: '儲存圖片',
      copyUserId: '複製使用者 ID',
      kickUser: '踢出 {name}',
      banUser: '封鎖 {name}',
      kickTitle: '將 {name} 踢出伺服器',
      kickPrompt: '若收到新邀請可再次加入。',
      banTitle: '要封鎖 {name} 嗎？',
      banPrompt: '在解除封鎖前無法再次加入。',
      reasonLabel: '原因（選填）',
      reasonPlaceholder: '輸入簡短原因…',
      moderationCancel: '取消',
      kickConfirm: '踢出',
      banConfirm: '封鎖',
      deleteMessage: '刪除訊息',
      someone: '某人',
      serverActionTitle: '伺服器',
      serverActionTitleCreate: '建立伺服器',
      serverActionTitleJoin: '加入伺服器',
      serverActionSelectDescription: '建立伺服器或透過邀請連結加入。',
      serverActionCreateDescription: '建立伺服器並邀請朋友加入。',
      serverActionJoinDescription: '透過邀請連結或代碼加入。',
      serverActionNameHint: '伺服器名稱可隨時更改。',
      serverActionNameLabel: '伺服器名稱',
      serverActionBack: '返回',
      serverActionCreateButton: '建立',
      serverActionJoinInstruction: '請輸入邀請連結或代碼。',
      serverActionJoinPlaceholder: '貼上邀請連結或代碼。',
      serverActionJoinButton: '加入',
      serverActionJoinLoading: '正在加入...',
      serverActionCreateFailed: '建立伺服器失敗。',
      serverActionJoinFailed: '無法加入伺服器。',
      serverActionJoinMissing: '請輸入邀請連結或代碼。',
      serverActionJoinInvalid: '邀請連結無效。',
      serverActionJoinExpired: '邀請連結已過期。',
      inviteLinkLoading: '正在產生連結...',
      inviteLinkFailed: '無法產生邀請連結。',
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
      placeholderMessageWithChannel: '在 # {channel} 中傳送訊息',
      send: '傳送',
    },
    messageList: {
      loadError: '無法載入訊息。',
      retry: '重新嘗試',
      loading: '正在載入訊息…',
      empty: '尚無訊息，先送出第一則吧！',
      adminTag: '👑 管理員',
    },
    home: {
      friends: '好友',
      online: '上線',
      addFriend: '新增好友',
      addFriendDescription: '使用使用者名稱新增好友。',
      addFriendPlaceholder: '輸入使用者名稱（不含 @）',
      addFriendAction: '送出',
      friendAddFailed: '無法送出好友邀請。',
      all: '全部',
      pending: '待處理',
      pendingIncoming: '收到的請求',
      pendingOutgoing: '已送出的請求',
      pendingEmpty: '目前沒有收到的請求。',
      pendingOutgoingEmpty: '目前沒有送出的請求。',
      pendingStatus: '待處理',
      accept: '接受',
      reject: '忽略',
      friendsEmpty: '尚未加入好友，先新增一位吧。',
      removeFriend: '刪除',
      messageRequests: '訊息請求',
      directMessages: '私訊',
      directEmpty: '尚無私訊。',
      directFallback: '私訊',
      activity: '正在活動',
      activityItem: '活動 {idx}',
      activityHint: '現在加入',
    },
    sidebarChannels: {
      serverName: '伺服器',
      serverSettings: '伺服器設定',
      invite: '邀請加入伺服器',
      notifications: '通知設定',
      createCategory: '建立類別',
      channelsTitle: '頻道',
      guestDisabled: '訪客模式下此功能不可用。',
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
      createTitle: '建立頻道',
      createSubtitle: '在此伺服器建立新頻道。',
      createCategoryTitle: '建立類別',
      createCategorySubtitle: '建立新的類別來整理頻道。',
      channelType: '頻道類型',
      textOption: '文字',
      textOptionDesc: '傳送訊息、圖片、GIF 等。',
      voiceOption: '語音',
      voiceOptionDesc: '使用語音聊天與螢幕分享。',
      categoryOption: '類別',
      categoryOptionDesc: '將頻道分組到類別中。',
      channelNameLabel: '頻道名稱',
      channelNamePlaceholder: '新的頻道',
      categoryNameLabel: '類別名稱',
      categoryNamePlaceholder: '新類別',
      categorySelectLabel: '類別',
      categorySelectNone: '不使用類別',
      cancelCreate: '取消',
      confirmCreate: '建立頻道',
      closeCreate: '關閉',
      leaveServer: '離開伺服器',
      leaveServerTitle: '確定要離開嗎？',
      leaveServerPrompt: '離開後需再次受邀才能存取此伺服器。',
      leaveServerConfirm: '離開',
      leaveServerCancel: '取消',
      leaveServerFailed: '離開伺服器失敗。',
    },
    sidebarGuilds: {
      add: '新增',
      addTooltip: '新增伺服器',
    },
    serverSettings: {
      title: 'DD Server',
      serverProfile: '伺服器資訊',
      users: '使用者',
      invites: '邀請',
      manage: '管理',
      admins: '管理員',
      bans: '封鎖',
      profileTitle: '伺服器資訊',
      profileSubtitle: '在此更新伺服器名稱與圖示。',
      nameLabel: '伺服器名稱',
      namePlaceholder: '輸入伺服器名稱',
      nameSave: '儲存',
      nameSaving: '儲存中',
      nameRequired: '請輸入伺服器名稱。',
      nameSaveFailed: '無法更新伺服器名稱。',
      iconLabel: '伺服器圖示',
      iconHint: '建議使用方形圖片（至少 256x256）。',
      iconChange: '變更圖示',
      iconUploading: '上傳中',
      iconSaveFailed: '無法更新伺服器圖示。',
      previewTitle: '預覽',
      invitesTitle: '邀請',
      invitesSubtitle: '查看並管理此伺服器的邀請連結。',
      inviteEmpty: '目前沒有邀請連結。',
      inviteCreator: '邀請者',
      inviteCode: '邀請碼',
      inviteCreatedAt: '建立時間',
      inviteExpires: '剩餘時間',
      inviteNoExpire: '永久',
      inviteExpired: '已過期',
      inviteDelete: '刪除邀請',
      bansTitle: '封鎖',
      bansSubtitle: '管理此伺服器的封鎖使用者。',
      bansEmpty: '目前沒有封鎖使用者。',
      unban: '解除封鎖',
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
      disconnect: '斷開連線',
      join: '加入',
      screenShare: '螢幕分享',
      stopShare: '停止分享',
      screenShareYou: '你的螢幕',
      screenShareUnsupported: '目前環境不支援螢幕分享。',
      screenShareFailed: '無法開始螢幕分享。',
      screenShareSelectTitle: '選擇螢幕',
      screenShareSelectHint: '選擇要分享的螢幕或視窗。',
      screenShareSelectCancel: '取消',
      screenShareSelectConfirm: '分享',
      screenShareSelectNone: '請選擇要分享的螢幕。',
      screenShareSettings: '螢幕分享設定',
      screenShareResolution: '畫面解析度',
      screenShareFrameRate: '幀率',
      screenShareMuteAudio: '靜音分享音訊',
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
      displayNameLabel: '顯示名稱',
      displayNamePlaceholder: '輸入顯示名稱',
      saveChanges: '儲存變更',
      saving: '儲存中…',
      changeAvatar: '更換頭像',
      uploadingAvatar: '上傳中…',
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
        webrtc: '預設',
        off: '關閉',
      },
      outputDevice: '輸出裝置',
      inputDevice: '輸入裝置',
      deviceDefault: '預設',
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
      logout: '登出',
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
      loginTab: '登入',
      signupTab: '註冊',
      usernameLabel: '名稱',
      usernamePlaceholder: '請輸入名稱',
      emailLabel: '電子郵件',
      emailPlaceholder: 'you@example.com',
      passwordLabel: '密碼',
      passwordPlaceholder: '請輸入密碼',
      loginAction: '登入',
      signupAction: '建立帳號',
      discordAction: '使用 Discord 繼續',
      guestLabel: '訪客名稱',
      guestPlaceholder: '請輸入名稱',
      guestAction: '以訪客身分繼續',
      guestDivider: '或',
      guestRequired: '請輸入名稱。',
      guestLoading: '正在進入…',
      errorGeneric: '發生錯誤，請再試一次。',
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
