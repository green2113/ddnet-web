import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

type ServerSettingsProps = {
  showSettings: boolean
  canManage: boolean
  serverName?: string
  serverIcon?: string | null
  nameSaving?: boolean
  iconUploading?: boolean
  saveError?: string
  onCloseSettings: () => void
  onUpdateName?: (name: string) => void
  onUpdateIcon?: (file: File) => void
  invites: Array<{
    code: string
    serverId: string
    createdBy: string
    createdAt: number
    expiresAt?: number | null
    expired?: boolean
    uses?: number
  }>
  onDeleteInvite?: (code: string) => void
  onAddAdmin?: (id: string) => void
  onRemoveAdmin?: (id: string) => void
  adminIds: string[]
  bannedMembers: Array<{
    id: string
    username: string
    displayName?: string
    avatar?: string | null
  }>
  onUnban?: (id: string) => void
  serverMembers: Array<{
    id: string
    username: string
    displayName?: string
    avatar?: string | null
  }>
  t: {
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
      iconLabel: string
      iconHint: string
      iconChange: string
      iconUploading: string
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
  }
}

export default function ServerSettings({
  showSettings,
  canManage,
  serverName,
  serverIcon,
  nameSaving,
  iconUploading,
  saveError,
  onCloseSettings,
  onUpdateName,
  onUpdateIcon,
  invites,
  onDeleteInvite,
  onAddAdmin,
  onRemoveAdmin,
  adminIds,
  bannedMembers,
  onUnban,
  serverMembers,
  t,
}: ServerSettingsProps) {
  const [nameValue, setNameValue] = useState(serverName || '')
  const [localError, setLocalError] = useState('')
  const [activeTab, setActiveTab] = useState<'profile' | 'admins' | 'bans' | 'invites'>('profile')
  const [closing, setClosing] = useState(false)
  const [inviteTick, setInviteTick] = useState(Date.now())
  const [showMemberList, setShowMemberList] = useState(false)
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null)
  const [memberQuery, setMemberQuery] = useState('')
  const fileRef = useRef<HTMLInputElement | null>(null)
  const memberFieldRef = useRef<HTMLDivElement | null>(null)
  const closeTimerRef = useRef<number | null>(null)

  useEffect(() => {
    if (!showSettings) return
    setNameValue(serverName || '')
    setLocalError('')
    setActiveTab('profile')
    setClosing(false)
    setInviteTick(Date.now())
    setShowMemberList(false)
    setSelectedMemberId(null)
    setMemberQuery('')
  }, [serverName, showSettings])

  useEffect(() => {
    if (!showSettings || activeTab !== 'invites') return
    const timer = window.setInterval(() => setInviteTick(Date.now()), 1000)
    return () => window.clearInterval(timer)
  }, [showSettings, activeTab])

  useEffect(() => {
    const handler = (event: MouseEvent) => {
      if (!memberFieldRef.current) return
      if (memberFieldRef.current.contains(event.target as Node)) return
      setShowMemberList(false)
    }
    window.addEventListener('mousedown', handler)
    return () => window.removeEventListener('mousedown', handler)
  }, [])

  useEffect(() => {
    return () => {
      if (closeTimerRef.current) {
        window.clearTimeout(closeTimerRef.current)
      }
    }
  }, [])

  if (!showSettings || !canManage) return null

  const handleClose = () => {
    if (closing) return
    setClosing(true)
    closeTimerRef.current = window.setTimeout(() => {
      onCloseSettings()
      setClosing(false)
      closeTimerRef.current = null
    }, 180)
  }

  const handleSaveName = () => {
    const trimmed = nameValue.trim()
    if (!trimmed) {
      setLocalError(t.serverSettings.nameRequired)
      return
    }
    setLocalError('')
    onUpdateName?.(trimmed)
  }

  const selectedMember = selectedMemberId
    ? serverMembers.find((member) => member.id === selectedMemberId) || null
    : null

  const normalizedQuery = memberQuery.trim().toLowerCase()
  const filteredMembers = serverMembers
    .filter((member) => {
      if (!normalizedQuery) return true
      const display = (member.displayName || '').toLowerCase()
      const username = (member.username || '').toLowerCase()
      return display.includes(normalizedQuery) || username.includes(normalizedQuery)
    })
    .sort((a, b) => {
      if (!normalizedQuery) return 0
      const aDisplay = (a.displayName || '').toLowerCase()
      const bDisplay = (b.displayName || '').toLowerCase()
      const aUser = (a.username || '').toLowerCase()
      const bUser = (b.username || '').toLowerCase()
      const aStarts = aDisplay.startsWith(normalizedQuery) || aUser.startsWith(normalizedQuery)
      const bStarts = bDisplay.startsWith(normalizedQuery) || bUser.startsWith(normalizedQuery)
      if (aStarts !== bStarts) return aStarts ? -1 : 1
      return 0
    })

  const adminDisplayList = adminIds.map((id) => {
    const member = serverMembers.find((entry) => entry.id === id)
    return { id, member }
  })

  const handleIconFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    onUpdateIcon?.(file)
    event.target.value = ''
  }

  const serverInitial = (serverName || 'S').slice(0, 1).toUpperCase()
  const formatInviteDate = (value?: number | null) => {
    if (!value) return '-'
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return '-'
    return date.toLocaleString()
  }
  const formatInviteRemaining = (value?: number | null) => {
    if (!value) return t.serverSettings.inviteNoExpire
    const diff = value - inviteTick
    if (diff <= 0) return t.serverSettings.inviteExpired
    const totalSeconds = Math.floor(diff / 1000)
    const days = Math.floor(totalSeconds / 86400)
    const hours = Math.floor((totalSeconds % 86400) / 3600)
    const minutes = Math.floor((totalSeconds % 3600) / 60)
    const seconds = totalSeconds % 60
    const pad = (num: number) => String(num).padStart(2, '0')
    if (days > 0) return `${days}d ${pad(hours)}:${pad(minutes)}:${pad(seconds)}`
    return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`
  }

  return createPortal(
    <div className={`server-settings-overlay${closing ? ' is-closing' : ''}`} onMouseDown={handleClose}>
      <div className={`server-settings-panel${closing ? ' is-closing' : ''}`} onMouseDown={(event) => event.stopPropagation()}>
        <aside className="server-settings-nav">
          <div className="server-settings-nav-title">{serverName || t.serverSettings.title}</div>
          <button
            className={`server-settings-nav-item${activeTab === 'profile' ? ' is-active' : ''}`}
            onClick={() => setActiveTab('profile')}
          >
            {t.serverSettings.serverProfile}
          </button>
          <div className="server-settings-nav-section">{t.serverSettings.users}</div>
          <button
            className={`server-settings-nav-item${activeTab === 'invites' ? ' is-active' : ''}`}
            onClick={() => setActiveTab('invites')}
          >
            {t.serverSettings.invites}
          </button>
          <div className="server-settings-nav-section">{t.serverSettings.manage}</div>
          <button
            className={`server-settings-nav-item${activeTab === 'admins' ? ' is-active' : ''}`}
            onClick={() => setActiveTab('admins')}
          >
            {t.serverSettings.admins}
          </button>
          <button
            className={`server-settings-nav-item${activeTab === 'bans' ? ' is-active' : ''}`}
            onClick={() => setActiveTab('bans')}
          >
            {t.serverSettings.bans}
          </button>
        </aside>
        <section className="server-settings-content">
          <div className="server-settings-header">
            <div>
              <div className="server-settings-title">
                {activeTab === 'admins'
                  ? t.serverSettings.adminTitle
                  : activeTab === 'bans'
                    ? t.serverSettings.bansTitle
                    : activeTab === 'invites'
                      ? t.serverSettings.invitesTitle
                    : t.serverSettings.profileTitle}
              </div>
              <div className="server-settings-subtitle">
                {activeTab === 'admins'
                  ? t.serverSettings.adminSubtitle
                  : activeTab === 'bans'
                    ? t.serverSettings.bansSubtitle
                    : activeTab === 'invites'
                      ? t.serverSettings.invitesSubtitle
                    : t.serverSettings.profileSubtitle}
              </div>
            </div>
            <button className="server-settings-close" onClick={handleClose} aria-label={t.serverSettings.close}>
              ✕
            </button>
          </div>

          {activeTab === 'profile' ? (
            <div className="server-settings-grid">
              <div className="server-settings-form">
                <div className="server-settings-section">
                  <label className="server-settings-label">{t.serverSettings.nameLabel}</label>
                  <div className="server-settings-input-row">
                    <input
                      value={nameValue}
                      onChange={(event) => setNameValue(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') handleSaveName()
                      }}
                      className="server-settings-input"
                      placeholder={t.serverSettings.namePlaceholder}
                    />
                    <button
                      type="button"
                      className="server-settings-save"
                      onClick={handleSaveName}
                      disabled={nameSaving}
                    >
                      {nameSaving ? t.serverSettings.nameSaving : t.serverSettings.nameSave}
                    </button>
                  </div>
                  {localError ? <div className="server-settings-error">{localError}</div> : null}
                  {saveError ? <div className="server-settings-error">{saveError}</div> : null}
                </div>

                <div className="server-settings-section">
                  <label className="server-settings-label">{t.serverSettings.iconLabel}</label>
                  <div className="server-settings-icon-row">
                    <div className="server-settings-icon">
                      {serverIcon ? (
                        <img src={serverIcon} alt={serverName || 'server'} />
                      ) : (
                        <span>{serverInitial}</span>
                      )}
                      <button
                        type="button"
                        className="server-settings-icon-overlay"
                        onClick={() => fileRef.current?.click()}
                        disabled={iconUploading}
                      >
                        {iconUploading ? t.serverSettings.iconUploading : t.serverSettings.iconChange}
                      </button>
                    </div>
                    <div className="server-settings-hint">{t.serverSettings.iconHint}</div>
                  </div>
                  <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp,image/gif" onChange={handleIconFile} hidden />
                </div>
              </div>

              <div className="server-settings-preview">
                <div className="server-settings-preview-title">{t.serverSettings.previewTitle}</div>
                <div className="server-settings-preview-card">
                  <div className="server-settings-preview-banner" />
                  <div className="server-settings-preview-avatar">
                    {serverIcon ? (
                      <img src={serverIcon} alt={serverName || 'server'} />
                    ) : (
                      <span>{serverInitial}</span>
                    )}
                  </div>
                  <div className="server-settings-preview-text">
                    <div className="server-settings-preview-name">{serverName || nameValue || 'Server'}</div>
                    <div className="server-settings-preview-meta">{t.serverSettings.serverProfile}</div>
                  </div>
                  
                </div>
              </div>
            </div>
          ) : activeTab === 'invites' ? (
            <div className="server-settings-form">
              <div className="server-settings-section">
                {invites.length === 0 ? (
                  <div className="text-sm" style={{ color: 'var(--text-muted)' }}>
                    {t.serverSettings.inviteEmpty}
                  </div>
                ) : (
                  <div className="server-settings-invite-table">
                    <div className="server-settings-invite-head">
                      <span>{t.serverSettings.inviteCreator}</span>
                      <span>{t.serverSettings.inviteCode}</span>
                      <span>{t.serverSettings.inviteCreatedAt}</span>
                      <span>{t.serverSettings.inviteExpires}</span>
                    </div>
                    <div className="server-settings-invite-body">
                      {invites.map((invite) => {
                        const creator = serverMembers.find((member) => member.id === invite.createdBy)
                        const display = creator?.displayName || creator?.username || invite.createdBy
                        const username = creator?.username
                          ? creator.username.startsWith('@')
                            ? creator.username
                            : `@${creator.username}`
                          : invite.createdBy
                        return (
                          <div key={invite.code} className="server-settings-invite-row">
                            <div className="server-settings-invite-user">
                              <div className="server-settings-member-avatar">
                                {creator?.avatar ? (
                                  <img src={creator.avatar} alt={display} />
                                ) : (
                                  <span>{String(display).slice(0, 1)}</span>
                                )}
                              </div>
                              <div className="server-settings-invite-user-meta">
                                <div className="server-settings-invite-name">{display}</div>
                                <div className="server-settings-invite-username">{username}</div>
                              </div>
                            </div>
                            <div className="server-settings-invite-code">{invite.code}</div>
                            <div className="server-settings-invite-date">{formatInviteDate(invite.createdAt)}</div>
                            <div className="server-settings-invite-expire">{formatInviteRemaining(invite.expiresAt)}</div>
                            <button
                              type="button"
                              className="server-settings-invite-remove"
                              onClick={() => onDeleteInvite?.(invite.code)}
                              aria-label={`${t.serverSettings.inviteDelete}: ${invite.code}`}
                            >
                              ✕
                            </button>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : activeTab === 'admins' ? (
            <div className="server-settings-form">
              <div className="server-settings-section">
                <label className="server-settings-label">{t.serverSettings.adminAdd}</label>
                <div className="server-settings-admin-input" ref={memberFieldRef}>
                  <div className="server-settings-member-field">
                    {selectedMember ? (
                      <div className="server-settings-member-chip">
                        {selectedMember.avatar ? (
                          <img
                            src={selectedMember.avatar}
                            alt={selectedMember.displayName || selectedMember.username}
                          />
                        ) : (
                          <span className="server-settings-member-chip-initial">
                            {(selectedMember.displayName || selectedMember.username || 'U').slice(0, 1)}
                          </span>
                        )}
                        <span className="server-settings-member-chip-name">
                          {selectedMember.displayName || selectedMember.username}
                        </span>
                        <button
                          type="button"
                          className="server-settings-member-chip-remove"
                          aria-label="remove"
                          onClick={() => {
                            setSelectedMemberId(null)
                            setMemberQuery('')
                          }}
                        >
                          ×
                        </button>
                      </div>
                    ) : null}
                    <input
                      value={memberQuery}
                      onChange={(e) => {
                        setMemberQuery(e.target.value)
                        setSelectedMemberId(null)
                        setShowMemberList(true)
                      }}
                      onFocus={() => setShowMemberList(true)}
                      onBlur={() => {
                        window.setTimeout(() => setShowMemberList(false), 0)
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          if (!selectedMember?.id) return
                          onAddAdmin?.(selectedMember.id)
                          setMemberQuery('')
                          setSelectedMemberId(null)
                          setShowMemberList(false)
                        }
                        if (e.key === 'Backspace' && !memberQuery && selectedMember) {
                          e.preventDefault()
                          setSelectedMemberId(null)
                          setMemberQuery('')
                        }
                      }}
                      className="server-settings-input server-settings-member-input"
                      placeholder=""
                    />
                  </div>
                  <button
                    type="button"
                    className="server-settings-save"
                    onClick={() => {
                      if (!selectedMember?.id) return
                      onAddAdmin?.(selectedMember.id)
                      setMemberQuery('')
                      setSelectedMemberId(null)
                      setShowMemberList(false)
                    }}
                  >
                    {t.serverSettings.submit}
                  </button>
                  {showMemberList ? (
                    <div
                      className="server-settings-member-list"
                      onMouseDown={(event) => event.preventDefault()}
                    >
                      {filteredMembers.map((member) => {
                        const username = member.username?.startsWith('@') ? member.username : `@${member.username}`
                        return (
                          <button
                            key={member.id}
                            type="button"
                            className="server-settings-member-item"
                            onClick={() => {
                              setSelectedMemberId(member.id)
                              setMemberQuery('')
                              setShowMemberList(false)
                            }}
                          >
                            <div className="server-settings-member-left">
                              <div className="server-settings-member-avatar">
                                {member.avatar ? (
                                  <img src={member.avatar} alt={member.displayName || member.username} />
                                ) : (
                                  <span>{(member.displayName || member.username || 'U').slice(0, 1)}</span>
                                )}
                              </div>
                              <span className="server-settings-member-name">
                                {member.displayName || member.username}
                              </span>
                            </div>
                            <span className="server-settings-member-username">{username}</span>
                          </button>
                        )
                      })}
                    </div>
                  ) : null}
                </div>
                <div className="server-settings-admin-list">
                  {adminDisplayList.map(({ id, member }) => {
                    const name = member?.displayName || member?.username || id
                    const username = member?.username ? (member.username.startsWith('@') ? member.username : `@${member.username}`) : id
                    return (
                      <div key={id} className="server-settings-admin-row">
                        <div className="server-settings-admin-user">
                          <div className="server-settings-member-avatar">
                            {member?.avatar ? (
                              <img src={member.avatar} alt={name} />
                            ) : (
                              <span>{String(name).slice(0, 1)}</span>
                            )}
                          </div>
                          <span className="server-settings-admin-name">{name}</span>
                        </div>
                        <span className="server-settings-admin-username">{username}</span>
                        <button type="button" onClick={() => onRemoveAdmin?.(id)} aria-label={`${t.serverSettings.adminRemove}: ${id}`}>
                          ×
                        </button>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          ) : (
            <div className="server-settings-form">
              <div className="server-settings-section">
                {bannedMembers.length === 0 ? (
                  <div className="text-sm" style={{ color: 'var(--text-muted)' }}>
                    {t.serverSettings.bansEmpty}
                  </div>
                ) : (
                  <div className="server-settings-admin-list">
                    {bannedMembers.map((member) => {
                      const name = member.displayName || member.username || member.id
                      const username = member.username?.startsWith('@') ? member.username : `@${member.username}`
                      return (
                        <div key={member.id} className="server-settings-admin-row">
                          <div className="server-settings-admin-user">
                            <div className="server-settings-member-avatar">
                              {member.avatar ? (
                                <img src={member.avatar} alt={name} />
                              ) : (
                                <span>{String(name).slice(0, 1)}</span>
                              )}
                            </div>
                            <span className="server-settings-admin-name">{name}</span>
                          </div>
                          <span className="server-settings-admin-username">{username}</span>
                          <button type="button" onClick={() => onUnban?.(member.id)}>
                            {t.serverSettings.unban}
                          </button>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </section>
      </div>
    </div>,
    document.body,
  )
}
