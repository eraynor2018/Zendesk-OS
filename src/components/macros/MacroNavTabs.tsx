import { NavLink } from 'react-router-dom';

const tabs = [
  { to: '/macros/library', label: 'Macro Library' },
  { to: '/macros/review', label: 'Review Session' },
  { to: '/macros/settings', label: 'Settings' },
];

export default function MacroNavTabs() {
  return (
    <nav className="border-b border-pastel mb-6">
      <div className="flex gap-1">
        {tabs.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            className={({ isActive }) =>
              `px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                isActive
                  ? 'border-green text-turf'
                  : 'border-transparent text-slate-green hover:text-turf hover:border-pastel'
              }`
            }
          >
            {tab.label}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
