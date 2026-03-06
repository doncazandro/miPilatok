interface CardProps {
    children: React.ReactNode;
    className?: string;
    variant?: 'default' | 'glass';
}

export const Card: React.FC<CardProps> = ({ children, className = '', variant = 'default' }) => {
    const baseStyles = 'rounded-2xl p-6 transition-all duration-300';
    const variants = {
        default: 'bg-white border border-slate-200 shadow-premium hover:shadow-lg',
        glass: 'glass hover:bg-white/80',
    };

    return (
        <div className={`${baseStyles} ${variants[variant]} ${className}`}>
            {children}
        </div>
    );
};
