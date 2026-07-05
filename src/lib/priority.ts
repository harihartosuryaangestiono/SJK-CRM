import { Priority } from '@prisma/client'

export type PriorityResult = {
  priority: Priority
  stars: number
}

export function calculateAIPriorityScore(followersCount: number, gmvCount: number): PriorityResult {
  // 1. High Priority (5 stars or 4 stars)
  if (followersCount >= 100000 || gmvCount >= 150000000) {
    return { priority: Priority.HIGH, stars: 5 }
  }
  
  if (followersCount >= 50000 && gmvCount >= 50000000) {
    return { priority: Priority.HIGH, stars: 4 }
  }

  // 2. Medium Priority (4 stars or 3 stars or 2 stars)
  if (followersCount >= 50000 || gmvCount >= 50000000) {
    return { priority: Priority.MEDIUM, stars: 4 }
  }

  if (followersCount >= 15000 || gmvCount >= 15000000) {
    return { priority: Priority.MEDIUM, stars: 3 }
  }

  if (followersCount >= 5000 || gmvCount >= 5000000) {
    return { priority: Priority.MEDIUM, stars: 2 }
  }

  // 3. Low Priority (1 star)
  return { priority: Priority.LOW, stars: 1 }
}
