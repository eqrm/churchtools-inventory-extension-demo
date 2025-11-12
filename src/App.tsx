import { ErrorBoundary } from './components/common/ErrorBoundary';
import { AppRouter } from './router';

function App() {
    return (
        <ErrorBoundary>
            <AppRouter />
        </ErrorBoundary>
    );
}

export default App;
