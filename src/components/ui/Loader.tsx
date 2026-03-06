interface LoaderProps {
    className?: string;
    size?: 'sm' | 'md' | 'lg';
}

export const Loader = ({ className = '', size = 'md' }: LoaderProps) => {
    const sizeClasses = {
        sm: 'h-4 w-4 border-2',
        md: 'h-8 w-8 border-2',
        lg: 'h-12 w-12 border-4'
    };

    return (
        <div className={`flex justify-center items-center ${className}`}>
            <div className={`animate-spin rounded-full ${sizeClasses[size]} border-primary-600 border-t-transparent`}></div>
        </div>
    );
};
