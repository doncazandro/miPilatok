interface BadgeProps {
    children: React.ReactNode;
    variant?: 'success' | 'warning' | 'danger' | 'info';
    className?: string;
}

export const Badge: React.FC<BadgeProps> = ({ children, variant = 'info', className = '' }) => {
    const baseStyles = 'px-3 py-1 rounded-full text-xs font-semibold tracking-wide uppercase flex items-center gap-1.5 w-fit';
    const variants = {
        success: 'bg-emerald-50 text-emerald-700 border border-emerald-100',
        warning: 'bg-yellow-50 text-yellow-700 border border-yellow-100',
        danger: 'bg-red-50 text-red-700 border border-red-100',
        info: 'bg-primary-50 text-primary-700 border border-primary-100',
    };

    return (
        <div className={`${baseStyles} ${variants[variant]} ${className}`}>
            <span className="w-1.5 h-1.5 rounded-full bg-current opacity-60"></span>
            {children}
        </div>
    );
};
