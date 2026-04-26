import { BarChart2, Home, Library, Search } from 'lucide-react'

export const navItems = [
  {
    to: '/',
    label: 'Home',
    icon: Home,
    end: true,
  },
  {
    to: '/search',
    label: 'Search',
    icon: Search,
  },
  {
    to: '/library',
    label: 'Library',
    icon: Library,
  },
  {
    to: '/stats',
    label: 'Stats',
    icon: BarChart2,
  },
]
