import './App.css';
import Business from './Components/Business';

function App() {
    return (
        <div
            style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexDirection: 'column',
                padding: '10px 0',
                fontFamily: 'cursive',
            }}
        >
            <h2>RXDB</h2>
            <br />
            <Business />
        </div>
    );
}

export default App;
