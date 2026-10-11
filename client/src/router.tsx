import { createBrowserRouter } from "react-router-dom";
import { CustomerLayout } from "./components/layout/CustomerLayout";
import { PublicOnlyLayout } from "./components/auth/publicOnlyLayout";
import { SignInPage } from "./pages/auth/Sign-in";
import { SignUpPage } from "./pages/auth/Sign-up";
import { ProtectedLayout } from "./components/auth/ProtectedLayout";
import { RoleGuardLayout } from "./components/auth/RoleGuardLayout";
import { AdminLayout } from "./components/layout/AdminLayout";
import AdminDashboard from "./pages/admin/Dashboard";
import AdminProducts from "./pages/admin/Products";
import AdminCoupons from "./pages/admin/Promos";
import AdminSettings from "./pages/admin/Settings";
import AdminOrders from "./pages/admin/Orders";
import Collections from "./pages/customer/Collections";
import CollectionDetails from "./pages/customer/Collection-Details";
import CustomerOrderSuccessPage from "./pages/customer/Order-Sucess";
import CustomerEsewaSuccessPage from "./pages/customer/Esewa-Success";
import CustomerEsewaFailurePage from "./pages/customer/Esewa-Failure";
import { StoreHome } from "./pages/customer/Home";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <CustomerLayout />,
    children: [
      { index: true, element: <StoreHome /> },
      {
        element: <PublicOnlyLayout />,
        children: [
          {
            path: "sign-in/*",
            element: <SignInPage />,
          },
          {
            path: "sign-up/*",
            element: <SignUpPage />,
          },
          {
            path: "collections",
            element: <Collections />,
          },
          {
            path: "collection/:id",
            element: <CollectionDetails />,
          },
        ],
      },
      {
        element: <ProtectedLayout />,
        children: [
        {
          path: "order-success",
          element: <CustomerOrderSuccessPage />,
        },
        {
          // ESEWA_SUCCESS_URL should point here; eSewa appends
          // transaction_uuid, status and ref_id to the query string.
          path: "esewa-success",
          element: <CustomerEsewaSuccessPage />,
        },
        {
          // ESEWA_FAILURE_URL points here; eSewa redirects the browser to
          // this route and the page reports the failure to
          // /checkout/esewa/failure.
          path: "failure",
          element: <CustomerEsewaFailurePage />,
        },
        ],
      },
    ],
  },
  {
    element: <ProtectedLayout />,
    children: [
      {
        element: <RoleGuardLayout allow={["admin"]} />,

        children: [
          {
            path: "/admin",
            element: <AdminLayout />,
            children: [
              {
                index: true,
                element: <AdminDashboard />,
              },
              {
                path: "products",
                element: <AdminProducts />,
              },
              {
                path: "coupons",
                element: <AdminCoupons />,
              },
              {
                path: "orders",
                element: <AdminOrders />,
              },
              {
                path: "settings",
                element: <AdminSettings />,
              },
            ],
          },
        ],
      },
    ],
  },
]);
