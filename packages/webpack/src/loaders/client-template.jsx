import React from 'react';
import ReactDom from 'react-dom';

// eslint-disable-next-line
import App from '<%=appPath%>';
// eslint-disable-next-line
import Component from '<%=componentPath%>';

// eslint-disable-next-line
const state = window['<%=context%>'];
// eslint-disable-next-line
const mainEl = document.getElementById('<%=id%>');
const AppComponent = <App Component={Component} pageProps={state} />;

ReactDom.hydrate(AppComponent, mainEl);

if (module.hot) module.hot.accept();
