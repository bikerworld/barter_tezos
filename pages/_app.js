/* eslint-disable react-hooks/exhaustive-deps */
import '../styles/common.css'

import { library } from '@fortawesome/fontawesome-svg-core'
import { fas } from '@fortawesome/free-solid-svg-icons'
library.add(fas)

// dark mode
function MyApp({ Component, pageProps }) {
  return (
    <>
      <div id="wallet_connector_container"></div>
      <div id="wrapper" className="wrapper">
        <Component {...pageProps} />
      </div>
      <div id="push"></div>
    </>
  )
}

export default MyApp