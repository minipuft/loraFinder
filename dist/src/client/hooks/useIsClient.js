import { useState, useEffect } from 'react';
// Custom hook to determine if the code is running on the client-side
const useIsClient = () => {
    // State to track whether the code is running on the client
    const [isClient, setIsClient] = useState(false);
    useEffect(() => {
        // Set isClient to true after the component mounts
        // This effect runs only on the client-side
        setIsClient(true);
    }, []); // Empty dependency array ensures this effect runs only once
    // Return the current client state
    return isClient;
};
export default useIsClient;
//# sourceMappingURL=useIsClient.js.map