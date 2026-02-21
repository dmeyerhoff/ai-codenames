import anthropic from '../../assets/logos/anthropic.svg';
import deepseek from '../../assets/logos/deepseek.svg';
import google from '../../assets/logos/google.svg';
import xai from '../../assets/logos/xai.svg';
import moonshotai from '../../assets/logos/moonshotai.svg';
import minimax from '../../assets/logos/minimax.svg';
import mistral from '../../assets/logos/mistral.svg';
import openai from '../../assets/logos/openai.svg';
import qwen from '../../assets/logos/qwen.svg';
import stepfun from '../../assets/logos/stepfun.svg';
import zhipu from '../../assets/logos/zhipu.svg';
import meta from '../../assets/logos/meta.svg';

const LOGO_MAP: Record<string, string> = {
    'anthropic': anthropic,
    'deepseek': deepseek,
    'google': google,
    'xai': xai,
    'moonshotai': moonshotai,
    'minimax': minimax,
    'mistral': mistral,
    'openai': openai,
    'qwen': qwen,
    'stepfun': stepfun,
    'zhipu': zhipu,
    'meta': meta,
};

interface Props {
    provider: string;
    className?: string;
}

export default function ProviderLogo({ provider, className = "w-4 h-4" }: Props) {
    const key = provider.toLowerCase().replace(/[^a-z0-9]/g, '');
    const url = LOGO_MAP[key];

    if (!url) {
        return <span className={`inline-block ${className} bg-[#D4CDB8] rounded-full`} title={provider} />;
    }

    return (
        <img src={url} alt={provider} className={className} title={provider} />
    );
}
