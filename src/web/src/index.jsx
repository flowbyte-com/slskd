import 'semantic-ui-less/semantic.less';
import App from './components/App';
import { FavouritesProvider } from './components/Favourites/FavouritesContext';
import React from 'react';
import ReactDOM from 'react-dom';
import { BrowserRouter as Router } from 'react-router-dom';

ReactDOM.render(
  <Router>
    <FavouritesProvider>
      <App />
    </FavouritesProvider>
  </Router>,
  document.querySelector('#root'),
);
