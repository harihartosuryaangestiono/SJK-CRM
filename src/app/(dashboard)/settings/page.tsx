'use client'

import React, { useState, useEffect } from 'react'
import {
  Settings as SettingsIcon,
  MessageSquare,
  Users,
  Shield,
  Save,
  CheckCircle,
  Loader2
} from 'lucide-react'

interface ChatTemplate {
  id: string
  name: string
  type: string
  content: string
}

interface UserAccount {
  id: string
  email: string
  name: string
  role: string
}

export default function SettingsPage() {
  const [templates, setTemplates] = useState<ChatTemplate[]>([])
  const [users, setUsers] = useState<UserAccount[]>([])
  const [loading, setLoading] = useState(true)

  // Edit template states
  const [selectedTemplateId, setSelectedTemplateId] = useState('')
  const [templateName, setTemplateName] = useState('')
  const [templateContent, setTemplateContent] = useState('')
  const [savingTemplate, setSavingTemplate] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState('')

  const fetchSettingsData = async () => {
    try {
      setLoading(true)
      const [tempRes, userRes] = await Promise.all([
        fetch('/api/settings/templates'),
        fetch('/api/users')
      ])

      if (tempRes.ok) {
        const json = await tempRes.json()
        setTemplates(json.data || [])
        if (json.data && json.data.length > 0) {
          const first = json.data[0]
          setSelectedTemplateId(first.id)
          setTemplateName(first.name)
          setTemplateContent(first.content)
        }
      }

      if (userRes.ok) {
        const json = await userRes.json()
        setUsers(json.data || [])
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSettingsData()
  }, [])

  // Handle template selection change
  const handleTemplateChange = (id: string) => {
    const temp = templates.find(t => t.id === id)
    if (temp) {
      setSelectedTemplateId(id)
      setTemplateName(temp.name)
      setTemplateContent(temp.content)
      setSaveSuccess('')
    }
  }

  // Save template updates
  const handleSaveTemplate = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaveSuccess('')
    setSavingTemplate(true)

    try {
      const res = await fetch('/api/settings/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: selectedTemplateId || undefined,
          name: templateName,
          content: templateContent,
          type: templates.find(t => t.id === selectedTemplateId)?.type || 'intro'
        })
      })

      if (res.ok) {
        setSaveSuccess('Template berhasil disimpan!')
        fetchSettingsData()
      } else {
        throw new Error('Gagal menyimpan template.')
      }
    } catch (err: any) {
      alert(err.message)
    } finally {
      setSavingTemplate(false)
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-3">
        <Loader2 className="h-6 w-6 text-[#007AFF] animate-spin" />
        <p className="text-[#6E6E73] dark:text-[#8E8E93] text-xs font-semibold tracking-wide">Memuat konfigurasi system...</p>
      </div>
    )
  }

  return (
    <div className="fade-in space-y-6 max-w-[1000px] mx-auto pb-12">
      <div>
        <h1 className="text-[22px] font-bold tracking-tight text-[#1D1D1F] dark:text-white">Settings</h1>
        <p className="text-xs text-[#6E6E73] dark:text-[#8E8E93] mt-1 leading-relaxed">
          Atur template chat penawaran, kelola pengguna tim, dan hak akses tingkat enterprise.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Nav menu panel */}
        <div className="md:col-span-1 apple-card p-4 space-y-3 h-fit">
          <div className="flex items-center gap-2 border-b border-[#F2F2F7] dark:border-[#2C2C2E] pb-2.5 mb-1.5">
            <SettingsIcon className="h-4 w-4 text-[#007AFF]" />
            <h3 className="text-[10px] font-bold text-[#8E8E93] uppercase tracking-wider select-none">Menu Settings</h3>
          </div>
          
          <div className="space-y-1 text-xs">
            <div className="flex items-center gap-2.5 p-2 rounded-lg bg-[#007AFF]/8 text-[#007AFF] dark:bg-[#007AFF]/25 dark:text-[#4DB8FF] font-semibold">
              <MessageSquare className="h-4 w-4" />
              Template Outreach Chat
            </div>
            <div className="flex items-center gap-2.5 p-2 rounded-lg text-[#6E6E73] dark:text-[#8E8E93] hover:bg-[#F5F5F7] dark:hover:bg-zinc-800/40 font-medium">
              <Users className="h-4 w-4" />
              Team & Users Role
            </div>
            <div className="flex items-center gap-2.5 p-2 rounded-lg text-[#6E6E73] dark:text-[#8E8E93] hover:bg-[#F5F5F7] dark:hover:bg-zinc-800/40 font-medium">
              <Shield className="h-4 w-4" />
              Role Permission Policy
            </div>
          </div>
        </div>

        {/* Right Settings panel (Chat template editor) */}
        <div className="md:col-span-2 apple-card p-5 space-y-4">
          <div className="border-b border-[#F2F2F7] dark:border-[#2C2C2E] pb-3">
            <h3 className="text-sm font-bold text-[#1D1D1F] dark:text-white">Template Outreach Editor</h3>
            <p className="text-[10px] text-[#6E6E73] dark:text-[#8E8E93] mt-0.5">Edit dan simpan draft template WhatsApp & TikTok DM.</p>
          </div>

          <form onSubmit={handleSaveTemplate} className="space-y-4">
            {saveSuccess && (
              <div className="bg-[#EDFAF2] border border-[#BBF7D0] p-3 rounded-xl flex items-center gap-2 text-xs text-[#14532D] select-none">
                <CheckCircle className="h-4 w-4 shrink-0" />
                {saveSuccess}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-[#6E6E73] dark:text-[#8E8E93] uppercase tracking-wider block">Pilih Template</label>
                <select
                  value={selectedTemplateId}
                  onChange={(e) => handleTemplateChange(e.target.value)}
                  className="apple-input bg-[#F5F5F7] dark:bg-[#1E1E1E] text-xs font-semibold cursor-pointer"
                >
                  {templates.map(t => (
                    <option key={t.id} value={t.id} className="bg-white text-[#1D1D1F]">{t.name}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-[#6E6E73] dark:text-[#8E8E93] uppercase tracking-wider block">Nama Template</label>
                <input
                  type="text"
                  required
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                  className="apple-input"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between items-center text-[10px] font-bold text-[#6E6E73] dark:text-[#8E8E93] select-none">
                <span>ISI CHAT TEMPLATE</span>
                <span>Variable: [Username], [Deadline]</span>
              </div>
              <textarea
                required
                rows={8}
                value={templateContent}
                onChange={(e) => setTemplateContent(e.target.value)}
                className="w-full px-4 py-3 bg-[#F5F5F7] dark:bg-[#1E1E1E] border border-[#E5E5EA] dark:border-[#38383A] rounded-2xl text-xs leading-relaxed focus:outline-none focus:border-[#007AFF] text-[#1D1D1F] dark:text-white"
              />
            </div>

            <div className="pt-2 border-t border-[#F2F2F7] dark:border-[#2C2C2E]/60 flex justify-end">
              <button
                type="submit"
                disabled={savingTemplate}
                className="apple-btn-primary shadow-md shadow-[#007AFF]/15 text-xs flex items-center gap-1.5"
              >
                {savingTemplate ? (
                  <Loader2 className="h-4 w-4 animate-spin text-white" />
                ) : (
                  <>
                    <Save className="h-4 w-4" /> Simpan Template
                  </>
                )}
              </button>
            </div>
          </form>

          {/* User management list display */}
          <div className="pt-5 border-t border-[#F2F2F7] dark:border-[#2C2C2E] space-y-4">
            <div className="border-b border-[#F2F2F7] dark:border-[#2C2C2E] pb-2">
              <h4 className="text-[10px] font-bold text-[#8E8E93] uppercase tracking-wider">Team Members & Roles</h4>
            </div>
            
            <div className="space-y-2">
              {users.map((usr) => (
                <div key={usr.id} className="bg-[#F5F5F7] dark:bg-[#1E1E1E] border border-[#E5E5EA] dark:border-[#38383A] rounded-xl p-3 flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <div className="h-7 w-7 rounded-full bg-white dark:bg-zinc-800 border border-[#E5E5EA] dark:border-zinc-700 flex items-center justify-center text-[10px] text-zinc-400">
                      <Users className="h-3.5 w-3.5" />
                    </div>
                    <div>
                      <h5 className="text-xs font-bold text-[#1D1D1F] dark:text-white">{usr.name}</h5>
                      <p className="text-[10px] text-[#8E8E93] font-semibold">{usr.email}</p>
                    </div>
                  </div>
                  <span className="text-[9px] font-bold text-[#007AFF] dark:text-[#4DB8FF] bg-[#007AFF]/8 dark:bg-[#007AFF]/20 border border-[#007AFF]/20 px-2 py-0.5 rounded-full uppercase select-none">
                    {usr.role}
                  </span>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}
