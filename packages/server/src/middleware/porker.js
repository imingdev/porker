const getCurrentRes = (url, resources) => {
  const name = Object.keys(resources).find((n) => resources[n].regex.test(url));

  return resources[name];
};

const getContext = (url, regex, req, res) => {
  const params = {};
  const m = url.match(regex);

  for (let i = 1, len = m.length; i < len; i += 1) {
    const key = regex.keys[i - 1];
    if (key) {
      // Fix #1994: using * with props: true generates a param named 0
      params[key.name || 'pathMatch'] = typeof m[i] === 'string' ? decodeURIComponent(m[i]) : m[i];
    }
  }
  req.params = {
    ...req.params || {},
    ...params
  };
  return {
    params,
    req,
    res
  };
};

export default ({ renderer }) => async (req, res, next) => {
  try {
    const url = decodeURI(req.url);
    res.statusCode = 200;
    const { resources } = renderer;
    const { regex, view } = getCurrentRes(url, resources);
    const context = getContext(url, regex, req, res);

    const html = await renderer.render(view, context);

    // Send response
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Accept-Ranges', 'none'); // #3870
    res.setHeader('Content-Length', Buffer.byteLength(html));
    res.end(html, 'utf8');
    return html;
  } catch (err) {
    if (err.name === 'URIError') {
      err.statusCode = 400;
    }
    next(err);
  }
};
