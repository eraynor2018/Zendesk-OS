import useLocalStorage from './useLocalStorage';

function useApiKey() {
  const [apiKey, setApiKey, clearApiKey] = useLocalStorage<string>('mrv2_api_key', '');

  return {
    apiKey,
    setApiKey,
    clearApiKey,
    hasApiKey: apiKey.length > 0,
  };
}

export default useApiKey;
