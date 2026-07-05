import prisma from '@/lib/prisma'

export async function syncReminders() {
  try {
    const now = new Date()
    
    // 1. Fetch all active affiliates and deals
    const affiliates = await prisma.affiliate.findMany({
      where: { deletedAt: null },
      include: {
        pic: true,
        reminders: { where: { completed: false } }
      }
    })

    const deals = await prisma.deal.findMany({
      where: { deletedAt: null },
      include: {
        affiliate: true,
        reminders: { where: { completed: false } }
      }
    })

    const newReminders: any[] = []
    const notificationsToCreate: any[] = []

    // Helper to add reminder if not already existing
    const addReminderIfNew = (item: {
      affiliateId?: string | null
      dealId?: string | null
      type: string
      dueDate: Date
      message: string
      userId?: string | null
    }, existingList: any[]) => {
      const exists = existingList.some(r => r.type === item.type)
      if (!exists) {
        newReminders.push({
          affiliateId: item.affiliateId || null,
          dealId: item.dealId || null,
          type: item.type,
          dueDate: item.dueDate,
          completed: false
        })

        if (item.userId) {
          notificationsToCreate.push({
            userId: item.userId,
            title: `Reminder: ${item.type.replace(/_/g, ' ')}`,
            message: item.message,
            read: false,
            type: item.type.toLowerCase().replace(/_/g, '-')
          })
        }
      }
    }

    // 2. Evaluate Affiliate Contact Flow Rules
    for (const aff of affiliates) {
      if (aff.status === 'Blacklist') continue // Skip blacklisted creators

      const daysSinceUpdate = Math.floor((now.getTime() - aff.updatedAt.getTime()) / (1000 * 60 * 60 * 24))
      const picId = aff.picId

      // Sudah Dihubungi / Menunggu Balasan -> Follow Up 1 (H+3)
      if (
        (aff.status === 'Sudah Dihubungi' || aff.status === 'Menunggu Balasan') &&
        daysSinceUpdate >= 3
      ) {
        addReminderIfNew({
          affiliateId: aff.id,
          type: 'FOLLOW_UP_1',
          dueDate: new Date(aff.updatedAt.getTime() + 3 * 24 * 60 * 60 * 1000),
          message: `@${aff.username} perlu di-Follow Up 1 (H+3). Status saat ini: ${aff.status}`,
          userId: picId
        }, aff.reminders)
      }

      // Follow Up 1 -> Follow Up 2 (H+7 from initial update)
      if (aff.status === 'Follow Up 1' && daysSinceUpdate >= 4) {
        addReminderIfNew({
          affiliateId: aff.id,
          type: 'FOLLOW_UP_2',
          dueDate: new Date(aff.updatedAt.getTime() + 4 * 24 * 60 * 60 * 1000),
          message: `@${aff.username} perlu di-Follow Up 2 (H+7). Status saat ini: ${aff.status}`,
          userId: picId
        }, aff.reminders)
      }

      // Follow Up 2 -> No Response (H+14 from initial update)
      if (aff.status === 'Follow Up 2' && daysSinceUpdate >= 7) {
        addReminderIfNew({
          affiliateId: aff.id,
          type: 'NO_RESPONSE_REMINDER',
          dueDate: new Date(aff.updatedAt.getTime() + 7 * 24 * 60 * 60 * 1000),
          message: `@${aff.username} tidak merespons selama 14 hari. Ubah status ke No Response.`,
          userId: picId
        }, aff.reminders)
      }

      // No Response -> Re-Approach (H+30)
      if (aff.status === 'No Response' && daysSinceUpdate >= 30) {
        addReminderIfNew({
          affiliateId: aff.id,
          type: 'RE_APPROACH',
          dueDate: new Date(aff.updatedAt.getTime() + 30 * 24 * 60 * 60 * 1000),
          message: `@${aff.username} sudah 30 hari berada di status No Response. Saatnya melakukan Re-Approach.`,
          userId: picId
        }, aff.reminders)
      }
    }

    // 3. Evaluate Deal SOW Rules
    for (const deal of deals) {
      if (deal.affiliate?.status === 'Blacklist') continue // Skip if already blacklisted

      const picId = deal.picId || deal.affiliate?.picId
      
      // If sample is received and SOW is not completed
      if (deal.sampleReceivedDate && deal.progressCampaign !== 'COMPLETED' && deal.progressCampaign !== 'PAID') {
        const daysSinceReceived = Math.floor((now.getTime() - deal.sampleReceivedDate.getTime()) / (1000 * 60 * 60 * 24))
        const hasCompletedVideo = deal.uploadedVideoCount >= deal.targetVideo

        if (!hasCompletedVideo) {
          // Rule: Auto-blacklist at Day 14
          if (daysSinceReceived >= 14) {
            addReminderIfNew({
              dealId: deal.id,
              affiliateId: deal.affiliateId,
              type: 'SOW_OVERDUE',
              dueDate: new Date(deal.sampleReceivedDate.getTime() + 14 * 24 * 60 * 60 * 1000),
              message: `@${deal.affiliate?.username} otomatis diblacklist karena tidak mengupload video SOW dalam 14 hari.`,
              userId: picId
            }, deal.reminders)

            // Perform auto blacklist in DB
            await prisma.affiliate.update({
              where: { id: deal.affiliateId },
              data: {
                status: 'Blacklist',
                blacklistDate: now,
                blacklistReason: 'Tidak upload video SOW sampai batas waktu 14 hari setelah menerima sample.',
                blacklistNotes: `Auto-blacklist system. Video disepakati: ${deal.targetVideo}, Terupload: ${deal.uploadedVideoCount}.`
              }
            })

            // Log activity
            await prisma.activity.create({
              data: {
                affiliateId: deal.affiliateId,
                userId: picId || null,
                action: 'STATUS_CHANGE',
                details: `Status changed to 'Blacklist' (Auto-blacklist due to overdue SOW video upload)`
              }
            })
            
            // Log status history
            await prisma.statusHistory.create({
              data: {
                affiliateId: deal.affiliateId,
                oldStatus: deal.affiliate?.status || 'Deal',
                newStatus: 'Blacklist'
              }
            })

            continue // Move to next deal
          }

          // Rule: Day 12 last warning
          if (daysSinceReceived >= 12) {
            addReminderIfNew({
              dealId: deal.id,
              affiliateId: deal.affiliateId,
              type: 'SOW_LAST_WARNING',
              dueDate: new Date(deal.sampleReceivedDate.getTime() + 12 * 24 * 60 * 60 * 1000),
              message: `@${deal.affiliate?.username}: SOW Day 12. Peringatan Terakhir sebelum auto-blacklist!`,
              userId: picId
            }, deal.reminders)
          }
          // Rule: Day 9 follow up
          else if (daysSinceReceived >= 9) {
            addReminderIfNew({
              dealId: deal.id,
              affiliateId: deal.affiliateId,
              type: 'SOW_FOLLOW_UP_9',
              dueDate: new Date(deal.sampleReceivedDate.getTime() + 9 * 24 * 60 * 60 * 1000),
              message: `@${deal.affiliate?.username}: SOW Day 9. Belum menyelesaikan upload video.`,
              userId: picId
            }, deal.reminders)
          }
          // Rule: Day 6 follow up
          else if (daysSinceReceived >= 6) {
            addReminderIfNew({
              dealId: deal.id,
              affiliateId: deal.affiliateId,
              type: 'SOW_FOLLOW_UP_6',
              dueDate: new Date(deal.sampleReceivedDate.getTime() + 6 * 24 * 60 * 60 * 1000),
              message: `@${deal.affiliate?.username}: SOW Day 6. Belum menyelesaikan upload video.`,
              userId: picId
            }, deal.reminders)
          }
          // Rule: Day 3 follow up
          else if (daysSinceReceived >= 3) {
            addReminderIfNew({
              dealId: deal.id,
              affiliateId: deal.affiliateId,
              type: 'SOW_FOLLOW_UP_3',
              dueDate: new Date(deal.sampleReceivedDate.getTime() + 3 * 24 * 60 * 60 * 1000),
              message: `@${deal.affiliate?.username}: SOW Day 3. Belum menyelesaikan upload video.`,
              userId: picId
            }, deal.reminders)
          }
        }
      }
    }

    // 4. Save to Database
    if (newReminders.length > 0) {
      await prisma.reminder.createMany({
        data: newReminders
      })
    }

    if (notificationsToCreate.length > 0) {
      await prisma.notification.createMany({
        data: notificationsToCreate
      })
    }

    return {
      success: true,
      remindersCreated: newReminders.length,
      notificationsCreated: notificationsToCreate.length
    }
  } catch (error: any) {
    console.error('Error running smart reminder engine sync:', error)
    return { success: false, error: error.message }
  }
}
