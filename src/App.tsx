import { ErrorBoundary } from './components/common/ErrorBoundary';
import { AppRouter } from './router';
import { useGlobalUndo } from './hooks/useGlobalUndo';

function App() {
    useGlobalUndo();

    return (
        <ErrorBoundary>
            <AppRouter />
        </ErrorBoundary>
    );
}

export default App;
