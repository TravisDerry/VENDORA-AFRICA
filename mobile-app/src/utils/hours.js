// Opening hours as stored by the backend: { monday: { open: '08:00', close: '18:00', closed: false }, ... }
export const DAYS = [
  { id: 'monday', label: 'Monday' },
  { id: 'tuesday', label: 'Tuesday' },
  { id: 'wednesday', label: 'Wednesday' },
  { id: 'thursday', label: 'Thursday' },
  { id: 'friday', label: 'Friday' },
  { id: 'saturday', label: 'Saturday' },
  { id: 'sunday', label: 'Sunday' },
];

// '08:00' -> '8:00 AM'
export const formatTime = (t) => {
  const m = /^(\d{1,2}):(\d{2})$/.exec(String(t || ''));
  if (!m) return t || '';
  let h = Number(m[1]);
  const suffix = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return `${h}:${m[2]} ${suffix}`;
};

const isSet = (d) => d && (d.closed === true || (d.open && d.close));

// Rows to show customers, or null when the owner hasn't added hours
export const normalizeHours = (businessHours) => {
  if (!businessHours || typeof businessHours !== 'object') return null;
  if (!DAYS.some((d) => isSet(businessHours[d.id]))) return null;
  return DAYS.map((d) => {
    const v = businessHours[d.id] || {};
    return {
      id: d.id,
      day: d.label,
      closed: v.closed === true || !v.open,
      open: v.open || '',
      close: v.close || '',
      time: v.closed === true || !v.open ? 'Closed' : `${formatTime(v.open)} – ${formatTime(v.close)}`,
    };
  });
};
